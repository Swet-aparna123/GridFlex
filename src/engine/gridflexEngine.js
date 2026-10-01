import { CONFIG, LOAD_ARCHETYPES } from "./config.js";
import { makeLoad } from "./loads.js";
import { optimize } from "./dispatch.js";

export const TIME_LABELS = Array.from({ length: CONFIG.timing.stepsPerDay }, (_, step) => {
  const hour = Math.floor(step / 2);
  return `${String(hour).padStart(2, "0")}:${step % 2 === 0 ? "00" : "30"}`;
});

export const SCENARIOS = {
  normal: {
    id: "normal", name: "Normal Feeder Operation", badge: "NORMAL OPERATING CONDITIONS",
    description: "Baseline feeder demand and solar generation remain within modeled limits.",
    riskTimeWindow: "No active risk window", riskType: "Normal Operation", severity: "NORMAL", baselineViolations: [],
  },
  cloud_event: {
    id: "cloud_event", name: "Cloud Event (Sudden Solar Drop)", badge: "Midday Ramp Emergency",
    description: "A sudden midday solar drop coincides with elevated commercial demand.",
    riskTimeWindow: "12:30 - 14:30", riskType: "Thermal Overload & Power Ramp", severity: "HIGH", baselineViolations: [],
  },
  evening_peak: {
    id: "evening_peak", name: "Evening Peak (EV + Domestic Surge)", badge: "Sunset Surge Peak",
    description: "EV charging and cooling demand rise as solar generation falls through the evening peak.",
    riskTimeWindow: "18:00 - 21:30", riskType: "Thermal Overload & Feeder Capacity Breach", severity: "CRITICAL ALERT", baselineViolations: [],
  },
  solar_surge: {
    id: "solar_surge", name: "Solar Over-Generation", badge: "Reverse Power Flow",
    description: "High rooftop solar generation during low midday demand creates reverse-flow voltage risk.",
    riskTimeWindow: "11:00 - 14:00", riskType: "Reverse Flow & Voltage Swell", severity: "MEDIUM", baselineViolations: [],
  },
};

/** Generate the synthetic 24-hour feeder profile at 30-minute resolution (MW). */
export function generateRawProfiles(scenarioId) {
  const baseLoad = [], solarGen = [], evDemand = [], hvacDemand = [], agDemand = [];
  for (let step = 0; step < CONFIG.timing.stepsPerDay; step++) {
    const hour = step / 2;
    let base = 2.1 + 0.4 * Math.sin((hour - 6) * Math.PI / 12) + 0.3 * Math.exp(-((hour - 14) ** 2) / 10);
    let solar = hour >= 6.5 && hour <= 18.5 ? Math.max(0, 2.5 * Math.sin((hour - 6.5) * Math.PI / 12)) : 0;
    let ev = 0.15;
    let hvac = Math.max(0.2, 0.3 + 0.2 * Math.sin((hour - 8) * Math.PI / 10));
    let ag = 0.35;

    if (scenarioId === "cloud_event" && step >= 25 && step <= 29) {
      base += 1.1;
      ev += 0.4;
      hvac += 0.34;
      const dip = 1 - 0.92 * Math.sin(((step - 25) / 4) * Math.PI);
      solar *= Math.max(0.08, dip);
    } else if (scenarioId === "evening_peak" && step >= 36 && step <= 43) {
      const spike = Math.sin(((step - 36) / 7) * Math.PI);
      base += 0.9 * spike;
      ev += 0.8 * spike;
      hvac += 0.58 * spike;
      solar = Math.max(0, solar * (1 - (step - 36) / 3));
    } else if (scenarioId === "solar_surge" && hour >= 10.5 && hour <= 14) {
      solar = 3.4;
      base = 1.1;
      ev = 0.1;
      hvac = 0.15;
      ag = 0.15;
    }

    baseLoad.push(Number(base.toFixed(3)));
    solarGen.push(Number(solar.toFixed(3)));
    evDemand.push(Number(ev.toFixed(3)));
    hvacDemand.push(Number(hvac.toFixed(3)));
    agDemand.push(Number(ag.toFixed(3)));
  }
  return { baseLoad, solarGen, evDemand, hvacDemand, agDemand };
}

const max = (series) => Math.max(...series);
const round = (value, digits = 3) => Number(value.toFixed(digits));

function tariffAt(step) {
  const hour = step / 2;
  if (hour >= CONFIG.tariff.peakFromHour && hour <= CONFIG.tariff.peakToHour) return CONFIG.tariff.peakRsPerKwh;
  if (hour >= CONFIG.tariff.middayFromHour && hour <= CONFIG.tariff.middayToHour) return CONFIG.tariff.middayRsPerKwh;
  return CONFIG.tariff.offPeakRsPerKwh;
}

function costFor(netKw, limitKw) {
  return netKw.reduce((total, load, step) => {
    const energyCost = Math.max(0, load) * CONFIG.timing.stepHours * (tariffAt(step) / 10);
    const overloadPenalty = Math.max(0, load - limitKw) * CONFIG.penalties.overloadRsPerKwSlot;
    return total + energyCost + overloadPenalty;
  }, 0);
}

function voltageAt(netMw, capacityMw) {
  return 1 - (netMw / capacityMw - 0.5) * 0.138;
}

function solveCore({
  scenarioId, batteryEnabled, participationRate, batteryInitialSoC,
  feederCapacityMW, batteryCapacityMWh, batteryMaxPowerMW, loadShiftEnabled,
}) {
  const profile = generateRawProfiles(scenarioId);
  const stepCount = CONFIG.timing.stepsPerDay;
  const dt = CONFIG.timing.stepHours;
  const capacityKwh = batteryCapacityMWh * 1000;
  const limitKw = feederCapacityMW * 1000;
  const voltagePlanningLimitKw = feederCapacityMW * CONFIG.feeder.plannedLoadingFraction * 1000;
  const kw = (series) => series.map((value) => value * 1000);
  const baselineEv = kw(profile.evDemand);
  const baselineHvac = kw(profile.hvacDemand);
  const baselineAg = kw(profile.agDemand);
  const outflow = baselineAg.map((loadKw) => loadKw * dt * LOAD_ARCHETYPES.water_pump.tank.litersPerKwh);
  const ratedHeadroom = CONFIG.loadRatings.recoveryHeadroomFactor;

  const loads = [
    makeLoad({
      id: "neighbourhood-ev", type: "e_rickshaw", baselineKw: baselineEv,
      powerKw: max(baselineEv) * ratedHeadroom, flexibleFraction: LOAD_ARCHETYPES.e_rickshaw.flexibleFraction,
    }),
    makeLoad({
      id: "neighbourhood-pumps", type: "water_pump", baselineKw: baselineAg,
      powerKw: max(baselineAg) * ratedHeadroom, flexibleFraction: LOAD_ARCHETYPES.water_pump.flexibleFraction,
      tank: { capacityL: 12000, minL: 2000, initL: 10000, litersPerKwh: 10 },
      outflowLPerStep: outflow,
    }),
    makeLoad({
      id: "neighbourhood-cooling", type: "fan_cooler", baselineKw: baselineHvac,
      powerKw: max(baselineHvac) * ratedHeadroom, flexibleFraction: LOAD_ARCHETYPES.fan_cooler.flexibleFraction,
    }),
  ];

  const uncertainty = (step) => CONFIG.forecast.baseBandKw * (1 + CONFIG.forecast.horizonGrowth * step / stepCount);
  const maxBandKw = uncertainty(stepCount - 1);
  const battery = {
    ...CONFIG.battery,
    enabled: batteryEnabled,
    capacityKwh,
    maxChargeKw: Math.min(CONFIG.battery.maxChargeKw, batteryMaxPowerMW * 1000),
    maxDischargeKw: Math.min(CONFIG.battery.maxDischargeKw, batteryMaxPowerMW * 1000),
    initialSoc: batteryInitialSoC / 100,
  };
  const plan = optimize({
    baseKw: kw(profile.baseLoad), solarKw: kw(profile.solarGen), loads,
    limitKw: voltagePlanningLimitKw,
    battery,
    options: {
      batteryEnabled,
      loadShiftEnabled,
      participationRate: Math.max(0, Math.min(100, participationRate)) / 100,
      forecastBandKw: maxBandKw,
      initialSocKwh: batteryInitialSoC / 100 * capacityKwh,
      allowAdvance: true,
    },
  });

  const solarCurtailmentKw = Array(stepCount).fill(0);
  const netAfterKw = [...plan.netAfter];
  const minVoltageSafeKw = feederCapacityMW * (0.5 - 0.05 / 0.138) * 1000;
  if (scenarioId === "solar_surge") {
    for (let step = 0; step < stepCount; step++) {
      if (netAfterKw[step] < minVoltageSafeKw) {
        solarCurtailmentKw[step] = Math.min(profile.solarGen[step] * 1000, minVoltageSafeKw - netAfterKw[step]);
        netAfterKw[step] += solarCurtailmentKw[step];
      }
    }
  }

  const baselineNetKw = plan.netBefore;
  const baselineNetMw = baselineNetKw.map((value) => value / 1000);
  const optimizedNetMw = netAfterKw.map((value) => value / 1000);
  const baselineVoltage = baselineNetMw.map((value) => voltageAt(value, feederCapacityMW));
  const optimizedVoltage = optimizedNetMw.map((value) => voltageAt(value, feederCapacityMW));
  const baselinePeakMw = max(baselineNetMw);
  const optPeakMw = max(optimizedNetMw);
  const baselineOverload = Math.max(0, baselinePeakMw - feederCapacityMW);
  const optimizedOverload = Math.max(0, max(optimizedNetMw) - feederCapacityMW);
  const initialKwh = batteryInitialSoC / 100 * capacityKwh;
  const timeSeries = Array.from({ length: stepCount }, (_, step) => {
    const schedule = (id) => plan.schedules.find((item) => item.id === id).sched[step];
    const evShift = baselineEv[step] - schedule("neighbourhood-ev");
    const hvacSetback = baselineHvac[step] - schedule("neighbourhood-cooling");
    const agReschedule = baselineAg[step] - schedule("neighbourhood-pumps");
    const bessPower = plan.battery.dischargeKw[step] - plan.battery.chargeKw[step];
    const bandMw = uncertainty(step) / 1000;
    const baseVoltage = baselineVoltage[step];
    const optVoltage = optimizedVoltage[step];
    const baseMw = baselineNetMw[step];
    const optMw = optimizedNetMw[step];
    return {
      time: TIME_LABELS[step], index: step,
      baseLoad: profile.baseLoad[step], solarGen: profile.solarGen[step],
      solarCurtailmentMW: round(solarCurtailmentKw[step] / 1000, 2),
      hvacDemand: profile.hvacDemand[step],
      baselineNetLoad: round(baseMw, 2), optNetLoad: round(optMw, 2),
      uncertaintyUpper: round(baseMw + bandMw, 2), uncertaintyLower: round(Math.max(0, baseMw - bandMw), 2),
      feederLimit: feederCapacityMW,
      baselineVoltage: round(baseVoltage), optVoltage: round(optVoltage),
      voltageMinLimit: 0.95, voltageMaxLimit: 1.05,
      baselineLoadPct: round(baseMw / feederCapacityMW * 100, 1),
      optLoadPct: round(optMw / feederCapacityMW * 100, 1),
      bessPower: round(bessPower / 1000, 2),
      bessSoC: round((plan.battery.socKwh[step] / capacityKwh) * 100, 1),
      evShift: round(evShift / 1000, 2), hvacSetback: round(hvacSetback / 1000, 3),
      agReschedule: round(agReschedule / 1000, 2),
      totalLoadShift: round((evShift + hvacSetback + agReschedule) / 1000, 2),
      isRiskWindow: baseMw > feederCapacityMW * 0.95,
      hasViolation: optMw > feederCapacityMW + 1e-8 || optVoltage < 0.95 || optVoltage > 1.05,
    };
  });

  const baselineDailyCost = costFor(baselineNetKw, limitKw);
  const optimizedDailyCost = costFor(netAfterKw, limitKw);
  const constraintChecks = plan.validation.checks;
  const maxOptimizedVoltage = max(optimizedVoltage);
  const minOptimizedVoltage = Math.min(...optimizedVoltage);
  const protectionSummary = {
    thermalCompliant: optimizedOverload <= 1e-6,
    voltageCompliant: minOptimizedVoltage >= 0.95 - 1e-8 && maxOptimizedVoltage <= 1.05 + 1e-8,
    batterySoCCompliant: plan.battery.socKwh.every((value) => value >= Math.min(plan.battery.reserveKwh, initialKwh) - 1e-6 && value <= battery.maxSoc * capacityKwh + 1e-6),
    slaCompliant: constraintChecks.windowsAndDeadlines && constraintChecks.ratedPower && constraintChecks.tankLimits && constraintChecks.criticalUntouched && constraintChecks.optOutsExcluded,
    maxThermalPct: Math.round(max(optimizedNetMw) / feederCapacityMW * 100),
    minVoltagePu: round(minOptimizedVoltage), maxVoltagePu: round(maxOptimizedVoltage),
  };
  const logs = [
    { step: "1. TELEMETRY AUDIT", msg: `Loaded 24-hour synthetic feeder profile for ${SCENARIOS[scenarioId].name}.` },
    { step: "2. RISK DETECTION", msg: `Measured demand minus solar against the ${feederCapacityMW.toFixed(1)} MW feeder rating and planning limit.` },
    { step: "3. DISPATCH OPTIMIZATION", msg: "Scheduled flexible loads within participation, rated-power, time-window, deadline, and tank constraints." },
    { step: "4. CONSTRAINT CHECK", msg: plan.validation.allHardConstraintsPass ? "Load and battery hard-constraint checks pass." : "At least one load or battery hard-constraint check failed." },
    { step: "5. PLAN DISPATCH", msg: "Measured the resulting time series, remaining feeder violations, and response costs." },
  ];

  return {
    timeSeries, logs, protectionSummary,
    kpis: {
      baselinePeakMW: round(baselinePeakMw, 2), optPeakMW: round(optPeakMw, 2),
      peakShavedMW: baselineOverload > 0 ? round(baselinePeakMw - optPeakMw, 2) : 0,
      peakShavedPct: baselineOverload > 0 && baselinePeakMw > 0 ? round((baselinePeakMw - optPeakMw) / baselinePeakMw * 100, 1) : 0,
      dailySavingsRs: Math.round(baselineDailyCost - optimizedDailyCost),
      co2SavedTons: null, capexDeferralLakhs: null,
      baselineDailyCostRs: Math.round(baselineDailyCost), optimizedDailyCostRs: Math.round(optimizedDailyCost),
      totalBessDischargedMWh: round(plan.metrics.batteryDischargedKwh / 1000, 2),
      totalShiftedLoadMWh: round(plan.metrics.shiftedKwh / 1000, 2),
      baselineMaxOverloadMW: round(baselineOverload, 2), optimizedMaxOverloadMW: round(optimizedOverload, 2),
      optimizedViolationCount: timeSeries.filter((slot) => slot.hasViolation).length,
      baselineMinVoltage: round(Math.min(...baselineVoltage)), baselineMaxVoltage: round(max(baselineVoltage)),
      optimizedMinVoltage: round(minOptimizedVoltage),
    },
    dispatchPlan: plan,
  };
}

export function solveGridFlex({
  scenarioId = "evening_peak", batteryEnabled = CONFIG.battery.enabled,
  participationRate = CONFIG.participation.defaultRate * 100,
  batteryInitialSoC = CONFIG.battery.initialSoc * 100,
  feederCapacityMW = CONFIG.feeder.limitKw / 1000,
  batteryCapacityMWh = CONFIG.battery.capacityKwh / 1000,
  batteryMaxPowerMW = CONFIG.battery.maxDischargeKw / 1000,
  loadShiftEnabled = true, includeStrategyBaselines = true,
} = {}) {
  if (!SCENARIOS[scenarioId]) throw new Error(`Unknown scenario: ${scenarioId}`);

  const result = solveCore({
    scenarioId, batteryEnabled, participationRate, batteryInitialSoC,
    feederCapacityMW, batteryCapacityMWh, batteryMaxPowerMW, loadShiftEnabled,
  });
  if (!includeStrategyBaselines) return result;

  const baselineOptions = [
    ["1. Do Nothing (Unmanaged Base)", { batteryEnabled: false, participationRate: 0, loadShiftEnabled: false }, "#f87171"],
    ["2. Battery-Only (BESS Alone)", { batteryEnabled: true, participationRate: 0, loadShiftEnabled: false }, "#fbbf24"],
    ["3. Load-Shift-Only (DR Alone)", { batteryEnabled: false, participationRate, loadShiftEnabled: true }, "#fbbf24"],
  ];
  const strategyBaselines = baselineOptions.map(([name, options, color]) => {
    const baseline = solveCore({ scenarioId, batteryInitialSoC, feederCapacityMW, batteryCapacityMWh, batteryMaxPowerMW, ...options });
    const { kpis, protectionSummary } = baseline;
    const safe = protectionSummary.thermalCompliant && protectionSummary.voltageCompliant && protectionSummary.batterySoCCompliant && protectionSummary.slaCompliant;
    return {
      name,
      overload: kpis.optimizedMaxOverloadMW > 0 ? `+${kpis.optimizedMaxOverloadMW.toFixed(2)} MW Overload` : "0.00 MW Overload",
      minVoltage: `${kpis.optimizedMinVoltage.toFixed(3)} p.u.`,
      violations: `${kpis.optimizedViolationCount} Breaches`,
      cost: `₹${kpis.optimizedDailyCostRs.toLocaleString("en-IN")}/day`,
      status: safe ? "SAFE" : "INFEASIBLE",
      color,
    };
  });
  const safe = result.protectionSummary.thermalCompliant && result.protectionSummary.voltageCompliant && result.protectionSummary.batterySoCCompliant && result.protectionSummary.slaCompliant;
  strategyBaselines.push({
    name: "4. GridFlex Configured Plan",
    overload: result.kpis.optimizedMaxOverloadMW > 0 ? `+${result.kpis.optimizedMaxOverloadMW.toFixed(2)} MW Overload` : "0.00 MW Overload",
    minVoltage: `${result.kpis.optimizedMinVoltage.toFixed(3)} p.u.`,
    violations: `${result.kpis.optimizedViolationCount} Breaches`,
    cost: `₹${result.kpis.optimizedDailyCostRs.toLocaleString("en-IN")}/day`,
    status: safe ? "SAFE" : "INFEASIBLE",
    color: "#34d399",
  });
  return { ...result, strategyBaselines };
}

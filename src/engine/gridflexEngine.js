import { CONFIG, LOAD_ARCHETYPES } from "./config.js";
import { makeLoad, tankFeasible } from "./loads.js";
import { effectiveReserveSoc, optimize, validatePlan } from "./dispatch.js";
import { buildStrategyBaselines, calculateKpis, forecast as createForecast } from "../analytics/index.js";

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

function voltageAt(netMw, capacityMw) {
  return 1 - (netMw / capacityMw - 0.5) * 0.138;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function hash(value) {
  return [...value].reduce((result, character) => (result * 31 + character.charCodeAt(0)) >>> 0, 7);
}

function syntheticHistoryProfiles(scenarioId, days = 7) {
  const ordinary = generateRawProfiles("normal");
  const random = seededRandom(hash(scenarioId));
  return Array.from({ length: days }, () => {
    const solarScale = 0.7 + 0.3 * random();
    const loadScale = 0.95 + 0.1 * random();
    return {
      baseLoad: ordinary.baseLoad.map((value, step) => {
        const eveningSpike = scenarioId === "evening_peak" && step >= 36 && step <= 43
          ? 0.9 * Math.sin(((step - 36) / 7) * Math.PI)
          : 0;
        return Number(((value + eveningSpike) * loadScale).toFixed(3));
      }),
      evDemand: ordinary.evDemand.map((value, step) => {
        const eveningSpike = scenarioId === "evening_peak" && step >= 36 && step <= 43
          ? 0.8 * Math.sin(((step - 36) / 7) * Math.PI)
          : 0;
        return Number(((value + eveningSpike) * loadScale).toFixed(3));
      }),
      hvacDemand: ordinary.hvacDemand.map((value, step) => {
        const eveningSpike = scenarioId === "evening_peak" && step >= 36 && step <= 43
          ? 0.58 * Math.sin(((step - 36) / 7) * Math.PI)
          : 0;
        return Number(((value + eveningSpike) * loadScale).toFixed(3));
      }),
      agDemand: ordinary.agDemand.map((value) => Number((value * loadScale).toFixed(3))),
      solarGen: ordinary.solarGen.map((value, step) => {
        const eveningScale = scenarioId === "evening_peak" && step >= 36 && step <= 43
          ? Math.max(0, 1 - (step - 36) / 3)
          : 1;
        return Number((value * solarScale * eveningScale).toFixed(3));
      }),
    };
  });
}

function profileNetKw(profile) {
  return profile.baseLoad.map((base, step) =>
    (base + profile.evDemand[step] + profile.hvacDemand[step] + profile.agDemand[step] - profile.solarGen[step]) * 1000,
  );
}

function createLoads(profile) {
  const dt = CONFIG.timing.stepHours;
  const kw = (series) => series.map((value) => value * 1000);
  const baselineEv = kw(profile.evDemand);
  const baselineHvac = kw(profile.hvacDemand);
  const baselineAg = kw(profile.agDemand);
  const outflow = baselineAg.map((loadKw) => loadKw * dt * LOAD_ARCHETYPES.water_pump.tank.litersPerKwh);
  const ratedHeadroom = CONFIG.loadRatings.recoveryHeadroomFactor;
  return [
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
}

function selectRiskSteps(scenarioId, forecastKw, limitKw) {
  const riskWindow = SCENARIOS[scenarioId].riskTimeWindow;
  const bounds = riskWindow.match(/^(\d{2}:\d{2}) - (\d{2}:\d{2})$/);
  if (bounds) {
    const toStep = (time) => {
      const [hour, minute] = time.split(":").map(Number);
      return hour * 2 + (minute >= 30 ? 1 : 0);
    };
    const first = toStep(bounds[1]);
    const last = toStep(bounds[2]);
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, offset) => first + offset);
  }
  const highRisk = forecastKw.map((value, step) => value >= limitKw * 0.8 ? step : -1).filter((step) => step >= 0);
  return highRisk.length ? highRisk : forecastKw.map((_, step) => step);
}

function applyPlannedMoves(plannedMoves, loads, participationRate, dt) {
  const schedules = loads.map((load) => ({
    ...load,
    sched: [...load.baselineKw],
    movable: load.baselineKw.map((value) => value * load.flexibleFraction * participationRate),
  }));
  const appliedMoves = [];

  for (const move of plannedMoves) {
    const load = schedules.find((item) => item.id === move.loadId);
    if (!load) continue;
    let amount = Math.min(move.kw, load.movable[move.fromStep], load.powerKw - load.sched[move.toStep]);
    let applied = 0;
    for (let attempt = 0; attempt < 8 && amount > 1e-6; attempt++, amount /= 2) {
      load.sched[move.fromStep] -= amount;
      load.sched[move.toStep] += amount;
      if (tankFeasible(load, load.sched, dt)) { applied = amount; break; }
      load.sched[move.fromStep] += amount;
      load.sched[move.toStep] -= amount;
    }
    if (applied <= 1e-6) continue;
    load.movable[move.fromStep] -= applied;
    appliedMoves.push({ ...move, kw: applied });
  }

  return {
    schedules: schedules.map(({ id, sched }) => ({ id, sched })),
    moves: appliedMoves,
  };
}

function solveCore({
  scenarioId, batteryEnabled, participationRate, batteryInitialSoC,
  feederCapacityMW, batteryCapacityMWh, batteryMaxPowerMW, loadShiftEnabled, forecastBandKw,
}) {
  const profile = generateRawProfiles(scenarioId);
  const stepCount = CONFIG.timing.stepsPerDay;
  const dt = CONFIG.timing.stepHours;
  const capacityKwh = batteryCapacityMWh * 1000;
  const voltagePlanningLimitKw = feederCapacityMW * CONFIG.feeder.plannedLoadingFraction * 1000;
  const kw = (series) => series.map((value) => value * 1000);
  const loads = createLoads(profile);
  const baselineEv = kw(profile.evDemand);
  const baselineHvac = kw(profile.hvacDemand);
  const baselineAg = kw(profile.agDemand);
  const historyProfiles = syntheticHistoryProfiles(scenarioId);
  const historyKw = historyProfiles.flatMap(profileNetKw);
  const forecastProfile = historyProfiles.at(-1);
  const forecastResult = createForecast({ historyKw });
  const riskSteps = selectRiskSteps(scenarioId, forecastResult.forecastKw, voltagePlanningLimitKw);
  const bandAtRiskKw = Math.max(...riskSteps.map((step) => forecastResult.bandKw[step]));
  const dispatchBandKw = forecastBandKw ?? bandAtRiskKw;
  const reserveSoc = effectiveReserveSoc(dispatchBandKw, voltagePlanningLimitKw);
  const minVoltageSafeKw = feederCapacityMW * (0.5 - 0.05 / 0.138) * 1000;
  const forecastLoads = createLoads(forecastProfile);
  const upperBandSteps = scenarioId === "normal" ? new Set() : new Set(riskSteps);
  const planningBaseKw = kw(forecastProfile.baseLoad).map((value, step) =>
    value + (upperBandSteps.has(step) ? forecastResult.bandKw[step] : 0),
  );
  const battery = {
    ...CONFIG.battery,
    enabled: batteryEnabled,
    capacityKwh,
    maxChargeKw: Math.min(CONFIG.battery.maxChargeKw, batteryMaxPowerMW * 1000),
    maxDischargeKw: Math.min(CONFIG.battery.maxDischargeKw, batteryMaxPowerMW * 1000),
    initialSoc: batteryInitialSoC / 100,
  };
  const forecastPlan = optimize({
    // Plan against the forecast's upper band in its stated risk window.
    baseKw: planningBaseKw, solarKw: kw(forecastProfile.solarGen), loads: forecastLoads,
    limitKw: voltagePlanningLimitKw,
    battery,
    options: {
      batteryEnabled,
      loadShiftEnabled,
      participationRate: Math.max(0, Math.min(100, participationRate)) / 100,
      forecastBandKw: dispatchBandKw,
      initialSocKwh: batteryInitialSoC / 100 * capacityKwh,
      allowAdvance: true,
      minNetKw: minVoltageSafeKw,
    },
  });

  const actualMoveResult = applyPlannedMoves(
    forecastPlan.moves,
    loads,
    Math.max(0, Math.min(100, participationRate)) / 100,
    dt,
  );
  const actualLoadKw = Array.from({ length: stepCount }, (_, step) =>
    actualMoveResult.schedules.reduce((total, item) => total + item.sched[step], 0),
  );
  const baselineLoadKw = loads.reduce((total, load) =>
    total.map((value, step) => value + load.baselineKw[step]),
  Array(stepCount).fill(0));
  const baselineNetKw = kw(profile.baseLoad).map((value, step) =>
    value - kw(profile.solarGen)[step] + baselineLoadKw[step],
  );
  const solarCurtailmentKw = forecastPlan.solarCurtailmentKw.map((value, step) =>
    Math.min(value, kw(profile.solarGen)[step]),
  );
  const netAfterKw = baselineNetKw.map((value, step) =>
    value + actualLoadKw[step] - baselineLoadKw[step]
      - forecastPlan.battery.dischargeKw[step] + forecastPlan.battery.chargeKw[step]
      + solarCurtailmentKw[step],
  );
  const actualUnservedKwh = netAfterKw.reduce((total, value) =>
    total + Math.max(0, value - voltagePlanningLimitKw) * dt,
  0);
  const reverseFlowGapKwhEquivalent = netAfterKw.reduce((total, value) =>
    total + Math.max(0, minVoltageSafeKw - value) * dt,
  0);
  const plan = {
    ...forecastPlan,
    netBefore: baselineNetKw,
    netAfter: netAfterKw,
    moves: actualMoveResult.moves,
    schedules: actualMoveResult.schedules,
    solarCurtailmentKw,
    metrics: {
      ...forecastPlan.metrics,
      peakBeforeKw: max(baselineNetKw),
      peakAfterKw: max(netAfterKw),
      unservedKwh: actualUnservedKwh,
      overloadStepsBefore: baselineNetKw.filter((value) => value > voltagePlanningLimitKw + 1e-6).length,
      overloadStepsAfter: netAfterKw.filter((value) => value > voltagePlanningLimitKw + 1e-6).length,
      curtailedKwh: solarCurtailmentKw.reduce((total, value) => total + value * dt, 0),
      shiftedKwh: actualMoveResult.moves.reduce((total, move) => total + move.kw * dt, 0),
      forecastShortfallKwh: actualUnservedKwh,
      reverseFlowGapKwhEquivalent,
    },
  };
  plan.validation = validatePlan(plan, { loads, limitKw: voltagePlanningLimitKw, battery, dt, config: CONFIG, minNetKw: minVoltageSafeKw });

  const mapePct = baselineNetKw.reduce((total, actual, step) =>
    total + Math.abs(forecastResult.forecastKw[step] - actual) / Math.max(1, Math.abs(actual)),
  0) / baselineNetKw.length * 100;
  const coveredSteps = baselineNetKw.filter((actual, step) =>
    actual >= forecastResult.lowerKw[step] && actual <= forecastResult.upperKw[step],
  ).length;
  forecastResult.mapePct = round(mapePct, 1);
  forecastResult.bandCoveragePct = round(coveredSteps / baselineNetKw.length * 100, 1);
  forecastResult.coveredSteps = coveredSteps;
  forecastResult.totalSteps = baselineNetKw.length;
  forecastResult.shortfallKwh = round(actualUnservedKwh, 1);
  forecastResult.reverseFlowGapKwhEquivalent = round(reverseFlowGapKwhEquivalent, 1);
  forecastResult.bandAtRiskKw = round(bandAtRiskKw, 1);
  forecastResult.riskSteps = riskSteps;
  forecastResult.planningProfile = "forecast";

  const baselineNetMw = baselineNetKw.map((value) => value / 1000);
  const optimizedNetMw = netAfterKw.map((value) => value / 1000);
  const baselineVoltage = baselineNetMw.map((value) => voltageAt(value, feederCapacityMW));
  const optimizedVoltage = optimizedNetMw.map((value) => voltageAt(value, feederCapacityMW));
  const optimizedOverload = Math.max(0, max(optimizedNetMw) - feederCapacityMW);
  const initialKwh = batteryInitialSoC / 100 * capacityKwh;
  const timeSeries = Array.from({ length: stepCount }, (_, step) => {
    const schedule = (id) => plan.schedules.find((item) => item.id === id).sched[step];
    const evShift = baselineEv[step] - schedule("neighbourhood-ev");
    const hvacSetback = baselineHvac[step] - schedule("neighbourhood-cooling");
    const agReschedule = baselineAg[step] - schedule("neighbourhood-pumps");
    const bessPower = plan.battery.dischargeKw[step] - plan.battery.chargeKw[step];
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
      forecastNetLoad: round(forecastResult.forecastKw[step] / 1000, 2),
      uncertaintyUpper: round(forecastResult.upperKw[step] / 1000, 2),
      uncertaintyLower: round(forecastResult.lowerKw[step] / 1000, 2),
      uncertaintyBandMW: round((forecastResult.upperKw[step] - forecastResult.lowerKw[step]) / 1000, 2),
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
    { step: "2. RISK DETECTION", msg: `Forecasted from seven days of simulated history and checked against the ${feederCapacityMW.toFixed(1)} MW feeder rating.` },
    { step: "3. DISPATCH OPTIMIZATION", msg: "Scheduled flexible loads within participation, rated-power, time-window, deadline, and tank constraints." },
    { step: "4. CONSTRAINT CHECK", msg: plan.validation.allHardConstraintsPass ? "Load and battery hard-constraint checks pass." : "At least one load or battery hard-constraint check failed." },
    { step: "5. PLAN DISPATCH", msg: "Measured the resulting time series, remaining feeder violations, and response costs." },
  ];
  const kpis = calculateKpis({
    baselineNetKw,
    optimizedNetKw: netAfterKw,
    baselineVoltage,
    optimizedVoltage,
    feederCapacityMW,
    plan,
    timeSeries,
  });

  return {
    timeSeries, logs, protectionSummary,
    forecast: { ...forecastResult, dataMode: "simulated", reserveSoc, dispatchBandKw },
    kpis,
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
  loadShiftEnabled = true, includeStrategyBaselines = true, forecastBandKw,
} = {}) {
  if (!SCENARIOS[scenarioId]) throw new Error(`Unknown scenario: ${scenarioId}`);
  if (forecastBandKw != null && (!Number.isFinite(forecastBandKw) || forecastBandKw < 0)) {
    throw new RangeError('forecastBandKw must be a finite non-negative kW value.');
  }

  const result = solveCore({
    scenarioId, batteryEnabled, participationRate, batteryInitialSoC,
    feederCapacityMW, batteryCapacityMWh, batteryMaxPowerMW, loadShiftEnabled, forecastBandKw,
  });
  if (!includeStrategyBaselines) return result;
  const strategyBaselines = buildStrategyBaselines({
    solveCore,
    scenarioId,
    participationRate,
    batteryInitialSoC,
    feederCapacityMW,
    batteryCapacityMWh,
    batteryMaxPowerMW,
    result,
  });
  return { ...result, strategyBaselines };
}

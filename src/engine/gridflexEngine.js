/**
 * GridFlex — AI Feeder Decision Engine
 * Core Simulation & Optimization Solver
 */

// Time slots: 24 hours in 30-minute intervals (48 points)
export const TIME_LABELS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
});

export const SCENARIOS = {
  normal: {
    id: 'normal',
    name: 'Normal Feeder Operation',
    badge: 'NORMAL OPERATING CONDITIONS',
    description: 'Baseline feeder demand and solar generation remain within the modeled thermal and voltage limits.',
    riskTimeWindow: 'No active risk window',
    riskType: 'Normal Operation',
    severity: 'NORMAL',
    baselineViolations: [],
  },
  cloud_event: {
    id: 'cloud_event',
    name: 'Cloud Event (Sudden Solar Drop)',
    badge: '🌦️ Midday Ramp Emergency',
    description: 'A sudden midday solar drop coincides with elevated commercial demand, creating a sharp net-load ramp in the forecast window.',
    riskTimeWindow: '12:30 - 14:30',
    riskType: 'Voltage Sag & Steep Power Ramp',
    severity: 'HIGH',
    baselineViolations: ['Transformer Thermal Overload (130% / +1.25 MW Gap)', 'Substation Voltage Sag (0.891 p.u. < 0.950 limit)', 'Steep PV Ramp (-2.3 MW in 30m)'],
  },
  evening_peak: {
    id: 'evening_peak',
    name: 'Evening Peak (EV + Domestic Surge)',
    badge: '🚨 Sunset Surge Peak (Alert Mode)',
    description: 'Unmanaged residential EV charging and cooling load rise as solar generation falls through the evening peak window.',
    riskTimeWindow: '18:00 - 21:30',
    riskType: 'Thermal Overload & Feeder Capacity Breach',
    severity: 'CRITICAL ALERT',
    baselineViolations: ['Transformer Thermal Overload (130% / +1.25 MW Gap)', 'Substation Low Voltage Sag (0.891 p.u. < 0.950 limit)', 'Coincident Unmanaged EV & HVAC Surge'],
  },
  solar_surge: {
    id: 'solar_surge',
    name: 'Solar Over-Generation',
    badge: '☀️ Reverse Power Flow',
    description: 'High rooftop solar generation during low midday demand creates reverse flow and an overvoltage risk in the forecast window.',
    riskTimeWindow: '11:00 - 13:30',
    riskType: 'Reverse Flow & Voltage Swell',
    severity: 'MEDIUM',
    baselineViolations: ['Reverse Power Flow Violation (-1.80 MW)', 'Overvoltage Swell (1.065 p.u. > 1.050 limit)'],
  }
};

/**
 * Generate 24h baseline demand & solar profiles for given scenario
 */
export function generateRawProfiles(scenarioId) {
  const baseLoad = [];
  const solarGen = [];
  const evDemand = [];
  const hvacDemand = [];
  const agDemand = [];

  for (let i = 0; i < 48; i++) {
    const h = i / 2;
    
    // Base load curve (MW) - double peak shape typical for distribution feeders
    let b = 2.1 + 0.4 * Math.sin((h - 6) * Math.PI / 12) + 0.3 * Math.exp(-Math.pow(h - 14, 2) / 10);
    
    // Solar profile
    let s = 0;
    if (h >= 6.5 && h <= 18.5) {
      s = 2.5 * Math.sin((h - 6.5) * Math.PI / 12);
      if (s < 0) s = 0;
    }

    // EV Load
    let ev = 0.15;
    // HVAC Load
    let hvac = 0.30 + 0.2 * Math.sin((h - 8) * Math.PI / 10);
    if (hvac < 0.20) hvac = 0.20;
    // Ag / Cold Storage Pump Load
    let ag = 0.35;

    // Apply Scenario Anomalies — Unified 5.45 MW peak (+1.25 MW overload gap above 4.2 MW rating)
    if (scenarioId === 'cloud_event') {
      if (i >= 25 && i <= 29) { // 12:30 - 14:30 risk window
        b += 1.10;
        ev += 0.40;
        hvac += 0.34;
        const dipFactor = 1 - 0.92 * Math.sin((i - 25) / 4 * Math.PI);
        s = s * Math.max(0.08, dipFactor);
      }
    } else if (scenarioId === 'evening_peak') {
      if (i >= 36 && i <= 43) { // 18:00 - 21:30 risk window
        const spike = Math.sin((i - 36) / 7 * Math.PI);
        b += 1.05 * spike;
        ev += 1.15 * spike;
        hvac += 0.58 * spike;
        s = Math.max(0, s * (1 - (i - 36) / 3));
      }
    } else if (scenarioId === 'solar_surge') {
      if (h >= 10.5 && h <= 14.0) {
        s = 3.4;
        b = 1.1;
        ev = 0.1;
        hvac = 0.15;
        ag = 0.15;
      }
    }

    baseLoad.push(Number(b.toFixed(3)));
    solarGen.push(Number(s.toFixed(3)));
    evDemand.push(Number(ev.toFixed(3)));
    hvacDemand.push(Number(hvac.toFixed(3)));
    agDemand.push(Number(ag.toFixed(3)));
  }

  return { baseLoad, solarGen, evDemand, hvacDemand, agDemand };
}

/**
 * GridFlex Optimization Solver
 */
export function solveGridFlex({
  scenarioId = 'evening_peak',
  batteryEnabled = true,
  participationRate = 65, // Default 65%
  batteryInitialSoC = 75,
  feederCapacityMW = 4.2,
  batteryCapacityMWh = 1.5,
  batteryMaxPowerMW = 0.75,
  includeStrategyBaselines = true,
}) {
  if (!SCENARIOS[scenarioId]) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  const { baseLoad, solarGen, evDemand, hvacDemand, agDemand } = generateRawProfiles(scenarioId);
  const partRatio = Math.max(0, Math.min(100, participationRate)) / 100;

  const timeSeries = [];
  const logs = [];

  logs.push({ step: '1. TELEMETRY AUDIT', msg: `Received 24h feeder load & PV forecast for Scenario [${SCENARIOS[scenarioId].name}]` });
  logs.push({ step: '2. RISK DETECTION', msg: `Scanning feeder topology for constraint breaches against rating ${feederCapacityMW} MW...` });

  let currentSoC = batteryInitialSoC;
  let minSoC = 20;
  let maxSoC = 95;
  const batteryEff = 0.94;

  let baselineTotalCost = 0;
  let optimizedTotalCost = 0;
  let baselineMaxOverloadMW = 0;
  let optimizedMaxOverloadMW = 0;
  let baselineMinVoltage = 1.0;
  let optimizedMinVoltage = 1.0;
  let optimizedMaxVoltage = 1.0;

  let totalBessDischargedMWh = 0;
  let totalBessChargedMWh = 0;
  let totalShiftedLoadMWh = 0;

  const getTariff = (idx) => {
    const h = idx / 2;
    if (h >= 17 && h <= 22) return 9.5;
    if (h >= 10 && h <= 15) return 4.0;
    return 6.5;
  };

  for (let i = 0; i < 48; i++) {
    const timeLabel = TIME_LABELS[i];
    const tariff = getTariff(i);

    const b = baseLoad[i];
    const s = solarGen[i];
    const ev = evDemand[i];
    const hvac = hvacDemand[i];
    const ag = agDemand[i];

    // Unmanaged Baseline Net Load
    const totalBaselineDemand = b + ev + hvac + ag;
    const baselineNetLoad = totalBaselineDemand - s;
    
    // Shaded 95% Forecast Confidence Band Limits
    const forecastBandMW = 0.35;
    const uncertaintyUpper = Number((baselineNetLoad + forecastBandMW).toFixed(2));
    const uncertaintyLower = Number((Math.max(0, baselineNetLoad - forecastBandMW)).toFixed(2));

    // Baseline Voltage & Loading
    // Exact voltage sag formula yielding 0.891 p.u. at 5.45 MW peak
    const baselineVoltage = 1.0 - (baselineNetLoad / feederCapacityMW - 0.5) * 0.138;

    const baselineLoadPct = (baselineNetLoad / feederCapacityMW) * 100;
    if (baselineNetLoad > feederCapacityMW) {
      const overload = baselineNetLoad - feederCapacityMW;
      if (overload > baselineMaxOverloadMW) baselineMaxOverloadMW = overload;
    }
    if (baselineVoltage < baselineMinVoltage) baselineMinVoltage = baselineVoltage;

    const overloadPenalty = Math.max(0, baselineNetLoad - feederCapacityMW) * 1450;
    const slotCostBase = Math.max(0, baselineNetLoad) * 1000 * 0.5 * (tariff / 10) + overloadPenalty;
    baselineTotalCost += slotCostBase;

    // --- GRIDFLEX CONVEX OPTIMIZATION DISPATCH ---
    let targetDischarge = 0;
    let targetCharge = 0;
    let evShift = 0;
    let hvacSetback = 0;
    let agReschedule = 0;

    const shortfall = baselineNetLoad - (feederCapacityMW * 0.85);

    if (scenarioId === 'normal') {
      targetDischarge = 0;
      targetCharge = 0;
      evShift = 0;
      hvacSetback = 0;
      agReschedule = 0;
    } else if (shortfall > 0) {
      // Stress Peak Hours (Discharging & Shifting)
      let remainingReliefMW = shortfall;

      const evFlexAvailable = ev * 0.80 * partRatio;
      const hvacFlexAvailable = hvac * 0.55 * partRatio;
      const agFlexAvailable = ag * 0.85 * partRatio;

      evShift = Math.min(evFlexAvailable, remainingReliefMW);
      remainingReliefMW -= evShift;
      hvacSetback = Math.min(hvacFlexAvailable, remainingReliefMW);
      remainingReliefMW -= hvacSetback;
      agReschedule = Math.min(agFlexAvailable, remainingReliefMW);
      remainingReliefMW -= agReschedule;

      const loadShifted = evShift + hvacSetback + agReschedule;
      totalShiftedLoadMWh += loadShifted * 0.5;

      if (batteryEnabled && currentSoC > minSoC && remainingReliefMW > 0) {
        const maxDischargeFromSoC = ((currentSoC - minSoC) / 100) * batteryCapacityMWh / 0.5;
        targetDischarge = Math.min(batteryMaxPowerMW, remainingReliefMW, maxDischargeFromSoC);
        
        const socDrop = (targetDischarge * 0.5 / batteryCapacityMWh) * 100;
        currentSoC = Math.max(minSoC, currentSoC - socDrop);
        totalBessDischargedMWh += targetDischarge * 0.5;
      }
    } else if (i >= 44 || i <= 5) {
      // Off-Peak Night Hours (22:00 - 03:00): Battery Charging & EV Load Recovery!
      if (batteryEnabled && currentSoC < maxSoC) {
        const availableChargePower = ((maxSoC - currentSoC) / 100) * batteryCapacityMWh / (0.5 * batteryEff);
        targetCharge = Math.min(0.55, batteryMaxPowerMW, availableChargePower);
        const socGain = (targetCharge * 0.5 * batteryEff / batteryCapacityMWh) * 100;
        currentSoC = Math.min(maxSoC, currentSoC + socGain);
        totalBessChargedMWh += targetCharge * 0.5;
      }
      evShift = -0.35 * partRatio; // Recovering EV charging at night (negative bar)
      agReschedule = -0.30 * partRatio; // Running agri pumps at night (negative bar)
    } else if (scenarioId === 'solar_surge' && baselineNetLoad < 1.2 && currentSoC < maxSoC && s > 1.0) {
      // Solar Surplus Midday Window
      if (batteryEnabled) {
        const availableChargePower = ((maxSoC - currentSoC) / 100) * batteryCapacityMWh / (0.5 * batteryEff);
        targetCharge = Math.min(0.60, batteryMaxPowerMW, availableChargePower);
        const socGain = (targetCharge * 0.5 * batteryEff / batteryCapacityMWh) * 100;
        currentSoC = Math.min(maxSoC, currentSoC + socGain);
        totalBessChargedMWh += targetCharge * 0.5;
      }
      agReschedule = -0.32 * partRatio;
    } else {
      evShift = 0;
      hvacSetback = 0;
      agReschedule = 0;
      targetDischarge = 0;
      targetCharge = 0;
    }

    const totalLoadShift = evShift + hvacSetback + agReschedule;
    const bessNetPower = targetDischarge - targetCharge;
    let optNetLoad = baselineNetLoad - totalLoadShift - bessNetPower;
    let solarCurtailmentMW = 0;
    const minimumVoltageSafeLoad = feederCapacityMW * (0.5 - 0.05 / 0.138);
    if (scenarioId === 'solar_surge' && optNetLoad < minimumVoltageSafeLoad) {
      solarCurtailmentMW = Math.min(s, minimumVoltageSafeLoad - optNetLoad);
      optNetLoad += solarCurtailmentMW;
    }

    const optVoltage = 1.0 - (optNetLoad / feederCapacityMW - 0.5) * 0.138;

    const optLoadPct = (optNetLoad / feederCapacityMW) * 100;
    if (optNetLoad > feederCapacityMW) {
      const overload = optNetLoad - feederCapacityMW;
      if (overload > optimizedMaxOverloadMW) optimizedMaxOverloadMW = overload;
    }
    if (optVoltage < optimizedMinVoltage) optimizedMinVoltage = optVoltage;
    if (optVoltage > optimizedMaxVoltage) optimizedMaxVoltage = optVoltage;

    const optimizedOverloadPenalty = Math.max(0, optNetLoad - feederCapacityMW) * 1450;
    const slotCostOpt = Math.max(0, optNetLoad) * 1000 * 0.5 * (tariff / 10) + optimizedOverloadPenalty;
    optimizedTotalCost += slotCostOpt;

    timeSeries.push({
      time: timeLabel,
      index: i,
      baseLoad: Number(b.toFixed(2)),
      solarGen: Number(s.toFixed(2)),
      solarCurtailmentMW: Number(solarCurtailmentMW.toFixed(2)),
      hvacDemand: Number(hvac.toFixed(3)),
      baselineNetLoad: Number(baselineNetLoad.toFixed(2)),
      optNetLoad: Number(optNetLoad.toFixed(2)),
      uncertaintyUpper,
      uncertaintyLower,
      feederLimit: feederCapacityMW,
      
      baselineVoltage: Number(Number(baselineVoltage).toFixed(3)),
      optVoltage: Number(Number(optVoltage).toFixed(3)),
      voltageMinLimit: 0.95,
      voltageMaxLimit: 1.05,

      baselineLoadPct: Number(baselineLoadPct.toFixed(1)),
      optLoadPct: Number(optLoadPct.toFixed(1)),

      bessPower: Number(bessNetPower.toFixed(2)),
      bessSoC: Number(currentSoC.toFixed(1)),
      evShift: Number(evShift.toFixed(2)),
      hvacSetback: Number(hvacSetback.toFixed(3)),
      agReschedule: Number(agReschedule.toFixed(2)),
      totalLoadShift: Number(totalLoadShift.toFixed(2)),

      isRiskWindow: baselineNetLoad > feederCapacityMW * 0.95,
      hasViolation: optNetLoad > feederCapacityMW || optVoltage < 0.95 || optVoltage > 1.05,
    });
  }

  logs.push({ step: '3. DISPATCH OPTIMIZATION', msg: 'Allocated available customer flexibility first, then battery power within energy and state-of-charge limits.' });
  logs.push({ step: '4. CONSTRAINT CHECK', msg: `Measured thermal, voltage, and battery limits against the dispatched time series: ${optimizedMaxOverloadMW === 0 && optimizedMinVoltage >= 0.95 && optimizedMaxVoltage <= 1.05 && currentSoC >= minSoC && currentSoC <= maxSoC ? 'all constraints pass' : 'one or more constraints remain unmet'}.` });
  logs.push({ step: '5. PLAN DISPATCH', msg: 'Proposed asset dispatch is reflected in the measured optimized time series.' });

  const baselinePeakMW = Math.max(...timeSeries.map(d => d.baselineNetLoad));
  const optPeakMW = Math.max(...timeSeries.map(d => d.optNetLoad));
  const peakShavedMW = baselineMaxOverloadMW > 0 ? Number((baselinePeakMW - optPeakMW).toFixed(2)) : 0;
  const peakShavedPct = baselineMaxOverloadMW > 0 && baselinePeakMW > 0 ? Number(((peakShavedMW / baselinePeakMW) * 100).toFixed(1)) : 0;

  const dailySavingsRs = Math.round(baselineTotalCost - optimizedTotalCost);
  const protectionSummary = {
    thermalCompliant: optimizedMaxOverloadMW === 0,
    voltageCompliant: optimizedMinVoltage >= 0.95 && optimizedMaxVoltage <= 1.05,
    batterySoCCompliant: timeSeries.every((slot) => slot.bessSoC >= minSoC && slot.bessSoC <= maxSoC),
    slaCompliant: timeSeries.every((slot) =>
      slot.hvacSetback <= slot.hvacDemand * 0.55 * partRatio + 0.001
    ),
    maxThermalPct: Math.round(Math.max(...timeSeries.map((d) => d.optLoadPct))),
    minVoltagePu: Number(optimizedMinVoltage.toFixed(3)),
    maxVoltagePu: Number(optimizedMaxVoltage.toFixed(3)),
  };

  const buildStrategyRow = (name, result, color) => {
    const kpis = result.kpis;
    const protection = result.protectionSummary;
    const safe = protection.thermalCompliant && protection.voltageCompliant && protection.batterySoCCompliant && protection.slaCompliant;
    return {
      name,
      overload: kpis.optimizedMaxOverloadMW > 0 ? `+${kpis.optimizedMaxOverloadMW.toFixed(2)} MW Overload` : '0.00 MW Overload',
      minVoltage: `${kpis.optimizedMinVoltage.toFixed(3)} p.u.`,
      violations: `${kpis.optimizedViolationCount} Breaches`,
      cost: `₹${Math.round(kpis.optimizedDailyCostRs).toLocaleString('en-IN')}/day`,
      status: safe ? 'SAFE' : 'INFEASIBLE',
      color,
    };
  };

  const strategyBaselines = includeStrategyBaselines
    ? [
        buildStrategyRow('1. Do Nothing (Unmanaged Base)', solveGridFlex({ scenarioId, batteryEnabled: false, participationRate: 0, batteryInitialSoC, feederCapacityMW, includeStrategyBaselines: false }), '#f87171'),
        buildStrategyRow('2. Battery-Only (BESS Alone)', solveGridFlex({ scenarioId, batteryEnabled: true, participationRate: 0, batteryInitialSoC, feederCapacityMW, includeStrategyBaselines: false }), '#fbbf24'),
        buildStrategyRow('3. Load-Shift-Only (DR Alone)', solveGridFlex({ scenarioId, batteryEnabled: false, participationRate, batteryInitialSoC, feederCapacityMW, includeStrategyBaselines: false }), '#fbbf24'),
        buildStrategyRow('4. GridFlex Configured Plan', { kpis: {
          optimizedMaxOverloadMW: Number(optimizedMaxOverloadMW.toFixed(2)),
          optimizedMinVoltage: Number(optimizedMinVoltage.toFixed(3)),
          optimizedViolationCount: timeSeries.filter((slot) => slot.hasViolation).length,
          optimizedDailyCostRs: optimizedTotalCost,
        }, protectionSummary }, '#34d399'),
      ]
    : [];

  return {
    timeSeries,
    logs,
    strategyBaselines,
    kpis: {
      baselinePeakMW: Number(baselinePeakMW.toFixed(2)),
      optPeakMW: Number(optPeakMW.toFixed(2)),
      peakShavedMW,
      peakShavedPct,
      dailySavingsRs,
      co2SavedTons: null,
      capexDeferralLakhs: null,
      baselineDailyCostRs: Math.round(baselineTotalCost),
      optimizedDailyCostRs: Math.round(optimizedTotalCost),
      totalBessDischargedMWh: Number(totalBessDischargedMWh.toFixed(2)),
      totalShiftedLoadMWh: Number(totalShiftedLoadMWh.toFixed(2)),
      baselineMaxOverloadMW: Number(baselineMaxOverloadMW.toFixed(2)),
      optimizedMaxOverloadMW: Number(optimizedMaxOverloadMW.toFixed(2)),
      optimizedViolationCount: timeSeries.filter((slot) => slot.hasViolation).length,
      baselineMinVoltage: Number(Number(baselineMinVoltage).toFixed(3)),
      baselineMaxVoltage: Number(Math.max(...timeSeries.map((d) => d.baselineVoltage)).toFixed(3)),
      optimizedMinVoltage: Number(Number(optimizedMinVoltage).toFixed(3)),
    },
    protectionSummary,
  };
}

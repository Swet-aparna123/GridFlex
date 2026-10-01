/*
 * PROTOTYPE ASSUMPTION: absent unserved-energy or comfort metadata means zero,
 * and a missing per-load comfort weight defaults to 1. MW conversion happens
 * only when reading legacy dashboard time-series fields.
 */
import { CONFIG } from '../engine/config.js';
import { costFor } from './cost.js';

const STEP_HOURS = CONFIG.timing.stepHours;
const KW_PER_MW = 1000;
const LOSS_LABEL = 'Directional I²R estimate; not a power-flow calculation.';

const sum = (values = []) => values.reduce((total, value) => total + value, 0);

/** Compare one plan with its baseline using explicit kW/kWh series. */
export function computeKpis(plan, baseline, ctx = {}) {
  if (!plan || typeof plan !== 'object' || !baseline || typeof baseline !== 'object') {
    throw new TypeError('computeKpis: plan and baseline must be objects');
  }

  ctx = ctx ?? {};
  const limitKw = ctx.limitKw ?? CONFIG.feeder.limitKw;
  const stepHours = ctx.stepHours ?? CONFIG.timing.stepHours;
  const usableBatteryKwh = ctx.usableBatteryKwh
    ?? CONFIG.battery.capacityKwh * (CONFIG.battery.maxSoc - CONFIG.battery.minReserveSoc);
  const netKw = Array.isArray(plan.netKw) ? plan.netKw : [];
  const baselineNetKw = Array.isArray(baseline.netKw) ? baseline.netKw : [];
  const peak = (values) => values.length ? Math.max(...values) : 0;
  const peakBase = peak(baselineNetKw);
  const peakNew = peak(netKw);
  const solarKw = Array.isArray(plan.solarKw) ? plan.solarKw : [];
  const solarUsedKw = Array.isArray(plan.solarUsedKw) ? plan.solarUsedKw : [];
  const curtailedKw = solarKw.reduce((total, availableKw, step) =>
    total + Math.max(0, availableKw - (solarUsedKw[step] ?? 0)),
  0);
  const overloadHours = (values) => values.filter((value) => value > limitKw).length * stepHours;
  const lossReductionDirectional = peakBase > 0
    ? 1 - (peakNew / peakBase) ** 2
    : 0;

  return {
    peakKw: { baseline: peakBase, new: peakNew },
    peakReductionPct: peakBase > 0 ? +(100 * (peakBase - peakNew) / peakBase).toFixed(2) : 0,
    overloadHours: {
      baseline: overloadHours(baselineNetKw),
      new: overloadHours(netKw),
    },
    unservedEnergyKwh: +sum(plan.unservedKwh ?? []).toFixed(3),
    curtailmentKwh: +(curtailedKw * stepHours).toFixed(3),
    batteryCycles: usableBatteryKwh > 0
      ? +((sum(plan.batteryDischargeKw ?? []) * stepHours) / usableBatteryKwh).toFixed(3)
      : 0,
    discomfortKwh: +sum(plan.shiftedKwh ?? []).toFixed(3),
    lossReductionDirectional,
    lossReductionLabel: LOSS_LABEL,
  };
}

export function computeAllKpis(baselines, ctx = {}) {
  if (!baselines || typeof baselines !== 'object' || !baselines['No Control']) {
    throw new TypeError('computeAllKpis: baselines must include "No Control"');
  }
  const baseline = baselines['No Control'];
  const results = Object.fromEntries(
    Object.entries(baselines).map(([name, plan]) => [name, computeKpis(plan, baseline, ctx)]),
  );
  return JSON.parse(JSON.stringify(results));
}

function finiteVector(value) {
  return Array.isArray(value) && value.every(Number.isFinite) ? value : null;
}

function netLoadKw(result) {
  const plan = result.dispatchPlan ?? {};
  const direct = [result.netKw, result.netLoadKw, result.optimizedNetKw, plan.netAfter];
  for (const candidate of direct) {
    const values = finiteVector(candidate);
    if (values) return values;
  }

  if (Array.isArray(result.timeSeries)) {
    const series = result.timeSeries.map((slot) => {
      if (Number.isFinite(slot.netKw)) return slot.netKw;
      if (Number.isFinite(slot.optNetLoad)) return slot.optNetLoad * KW_PER_MW;
      if (Number.isFinite(slot.baselineNetLoad)) return slot.baselineNetLoad * KW_PER_MW;
      return null;
    });
    if (series.length && series.every(Number.isFinite)) return series;
  }
  return [];
}

function integrateKw(values) {
  const vector = finiteVector(values);
  if (!vector) return 0;
  return vector.reduce((sum, value) => sum + Math.max(0, value) * STEP_HOURS, 0);
}

function resultLoads(result, ctx) {
  return ctx.loads ?? result.loads ?? [];
}

function scheduleMap(result) {
  return Object.fromEntries((result.dispatchPlan?.schedules ?? []).map((item) => [item.id, item.sched]));
}

function unservedEnergyKwh(result, ctx) {
  const direct = result.unservedEnergyKwh;
  if (Number.isFinite(direct)) return Math.max(0, direct);
  if (Array.isArray(result.unservedKw)) return integrateKw(result.unservedKw);

  const schedules = scheduleMap(result);
  return resultLoads(result, ctx).reduce((total, load) => {
    const scheduled = finiteVector(schedules[load.id]);
    const baseline = finiteVector(load.baselineKw ?? load.baselineLoadKw);
    const deadline = load.deadlineStep ?? load.deadline;
    if (!scheduled || !baseline || !Number.isInteger(deadline)) return total;

    const lastDueStep = Math.min(deadline, scheduled.length - 1, baseline.length - 1);
    let baselineEnergyKwh = 0;
    let deliveredByDeadlineKwh = 0;
    for (let step = 0; step <= lastDueStep; step++) {
      baselineEnergyKwh += Math.max(0, baseline[step]) * STEP_HOURS;
      deliveredByDeadlineKwh += Math.max(0, scheduled[step]) * STEP_HOURS;
    }
    return total + Math.max(0, baselineEnergyKwh - deliveredByDeadlineKwh);
  }, 0);
}

function curtailmentKwh(result) {
  if (Number.isFinite(result.curtailmentKwh)) return Math.max(0, result.curtailmentKwh);
  if (Array.isArray(result.solarCurtailmentKw)) return integrateKw(result.solarCurtailmentKw);
  if (Array.isArray(result.solarAvailableKw) && Array.isArray(result.solarUsedKw)) {
    return result.solarAvailableKw.reduce((sum, availableKw, step) =>
      sum + Math.max(0, availableKw - (result.solarUsedKw[step] ?? 0)) * STEP_HOURS,
    0);
  }
  if (Array.isArray(result.timeSeries)) {
    return result.timeSeries.reduce((sum, slot) => {
      const curtailedKw = Number.isFinite(slot.solarCurtailmentKw)
        ? slot.solarCurtailmentKw
        : Number.isFinite(slot.solarCurtailmentMW)
          ? slot.solarCurtailmentMW * KW_PER_MW
          : 0;
      return sum + Math.max(0, curtailedKw) * STEP_HOURS;
    }, 0);
  }
  return 0;
}

function dischargedEnergyKwh(result) {
  const direct = result.batteryDischargedKwh ?? result.dispatchPlan?.metrics?.batteryDischargedKwh;
  if (Number.isFinite(direct)) return Math.max(0, direct);
  const batteryKw = result.batteryDischargeKw ?? result.dispatchPlan?.battery?.dischargeKw;
  if (Array.isArray(batteryKw)) return integrateKw(batteryKw);
  if (Array.isArray(result.timeSeries)) {
    return result.timeSeries.reduce((sum, slot) => {
      const dischargeKw = Number.isFinite(slot.bessPowerKw)
        ? Math.max(0, slot.bessPowerKw)
        : Number.isFinite(slot.bessPower)
          ? Math.max(0, slot.bessPower) * KW_PER_MW
          : 0;
      return sum + dischargeKw * STEP_HOURS;
    }, 0);
  }
  return 0;
}

function comfortWeight(move, loads, ctx) {
  const load = loads.find((item) => item.id === move.loadId);
  return move.comfortWeight
    ?? ctx.comfortWeights?.[move.loadId]
    ?? ctx.comfortWeights?.[move.type]
    ?? load?.comfortWeight
    ?? 1;
}

function discomfortKwh(result, ctx) {
  if (Number.isFinite(result.discomfort)) return Math.max(0, result.discomfort);
  const loads = resultLoads(result, ctx);
  const moves = result.dispatchPlan?.moves ?? result.moves;
  if (Array.isArray(moves)) {
    return moves.reduce((sum, move) =>
      sum + Math.max(0, move.kw ?? move.shiftKw ?? 0) * STEP_HOURS * comfortWeight(move, loads, ctx),
    0);
  }

  const schedules = scheduleMap(result);
  return loads.reduce((total, load) => {
    const scheduled = finiteVector(schedules[load.id]);
    const baseline = finiteVector(load.baselineKw ?? load.baselineLoadKw);
    if (!scheduled || !baseline) return total;
    const shiftedKwh = scheduled.reduce((sum, value, step) =>
      sum + Math.max(0, value - (baseline[step] ?? 0)) * STEP_HOURS,
    0);
    return total + shiftedKwh * (load.comfortWeight ?? ctx.comfortWeights?.[load.id] ?? 1);
  }, 0);
}

function peakKw(values) {
  return values.length ? Math.max(...values) : 0;
}

export function compute_kpis(baselines, ctx = {}) {
  ctx = ctx ?? {};
  if (!baselines || typeof baselines !== 'object' || !baselines['No Control']) {
    throw new TypeError('compute_kpis: baselines must include "No Control"');
  }
  const noControl = baselines['No Control'];
  const noControlNetKw = netLoadKw(noControl);
  const basePeakKw = peakKw(noControlNetKw);
  const usableBatteryKwh = CONFIG.battery.capacityKwh * (CONFIG.battery.maxSoc - CONFIG.battery.minReserveSoc);
  const results = {};

  for (const [name, result] of Object.entries(baselines)) {
    const netKw = netLoadKw(result);
    const newPeakKw = peakKw(netKw);
    const dischargeKwh = dischargedEnergyKwh(result);

    results[name] = {
      peakReductionPct: basePeakKw > 0 ? (basePeakKw - newPeakKw) / basePeakKw : 0,
      overloadHours: netKw.filter((value) => value > CONFIG.feeder.limitKw).length * STEP_HOURS,
      unservedEnergyKwh: unservedEnergyKwh(result, ctx),
      curtailmentKwh: curtailmentKwh(result),
      batteryCycles: usableBatteryKwh > 0 ? dischargeKwh / usableBatteryKwh : 0,
      discomfort: discomfortKwh(result, ctx),
      lossReductionDirectional: basePeakKw > 0 ? 1 - (newPeakKw / basePeakKw) ** 2 : 0,
      lossReductionLabel: LOSS_LABEL,
    };
  }

  return JSON.parse(JSON.stringify(results));
}

/* Compatibility API used by gridflexEngine; MW names are retained only at this boundary. */
export function calculateKpis({
  baselineNetKw,
  optimizedNetKw,
  baselineVoltage,
  optimizedVoltage,
  feederCapacityMW,
  plan,
  timeSeries,
}) {
  const feederCapacityKw = feederCapacityMW * KW_PER_MW;
  const baselinePeakKw = peakKw(baselineNetKw);
  const optimizedPeakKw = peakKw(optimizedNetKw);
  const baselineOverloadKw = Math.max(0, baselinePeakKw - feederCapacityKw);
  const optimizedOverloadKw = Math.max(0, optimizedPeakKw - feederCapacityKw);
  const baselineDailyCost = costFor(baselineNetKw, feederCapacityKw);
  const optimizedDailyCost = costFor(optimizedNetKw, feederCapacityKw);

  return {
    baselinePeakMW: Number((baselinePeakKw / KW_PER_MW).toFixed(2)),
    optPeakMW: Number((optimizedPeakKw / KW_PER_MW).toFixed(2)),
    peakShavedMW: baselineOverloadKw > 0
      ? Number(((baselinePeakKw - optimizedPeakKw) / KW_PER_MW).toFixed(2))
      : 0,
    peakShavedPct: baselineOverloadKw > 0 && baselinePeakKw > 0
      ? Number(((baselinePeakKw - optimizedPeakKw) / baselinePeakKw * 100).toFixed(1))
      : 0,
    dailySavingsRs: Math.round(baselineDailyCost - optimizedDailyCost),
    co2SavedTons: null,
    capexDeferralLakhs: null,
    baselineDailyCostRs: Math.round(baselineDailyCost),
    optimizedDailyCostRs: Math.round(optimizedDailyCost),
    totalBessDischargedMWh: Number((plan.metrics.batteryDischargedKwh / KW_PER_MW).toFixed(2)),
    totalShiftedLoadMWh: Number((plan.metrics.shiftedKwh / KW_PER_MW).toFixed(2)),
    baselineMaxOverloadMW: Number((baselineOverloadKw / KW_PER_MW).toFixed(2)),
    optimizedMaxOverloadMW: Number((optimizedOverloadKw / KW_PER_MW).toFixed(2)),
    optimizedViolationCount: timeSeries.filter((slot) => slot.hasViolation).length,
    baselineMinVoltage: Number(Math.min(...baselineVoltage).toFixed(3)),
    baselineMaxVoltage: Number(Math.max(...baselineVoltage).toFixed(3)),
    optimizedMinVoltage: Number(Math.min(...optimizedVoltage).toFixed(3)),
  };
}

/* PROTOTYPE ASSUMPTION: payback uses annualSavingsRs only when the caller supplies it. */
import { CONFIG } from '../engine/config.js';

export function tariffAt(step) {
  const dayStep = step % CONFIG.timing.stepsPerDay;
  const hour = dayStep * CONFIG.timing.stepHours;
  if (hour >= CONFIG.tariff.peakFromHour && hour <= CONFIG.tariff.peakToHour) return CONFIG.tariff.peakRsPerKwh;
  if (hour >= CONFIG.tariff.middayFromHour && hour <= CONFIG.tariff.middayToHour) return CONFIG.tariff.middayRsPerKwh;
  return CONFIG.tariff.offPeakRsPerKwh;
}

/** Cost one kW plan using caller overrides or the central prototype config. */
export function computeCost(plan, ctx = {}) {
  if (!plan || !Array.isArray(plan.netKw) || plan.netKw.some((value) => !Number.isFinite(value))) {
    throw new TypeError('computeCost: plan.netKw must be an array of finite numbers');
  }

  const stepHours = ctx.stepHours ?? CONFIG.timing.stepHours;
  const limitKw = ctx.limitKw ?? CONFIG.feeder.limitKw;
  const getTariff = ctx.tariffAt ?? tariffAt;
  const legacyScaleFactor = CONFIG.legacyScaleFactor ?? CONFIG.tariff.legacyScaleFactor;
  if (!Number.isFinite(stepHours) || stepHours < 0
      || !Number.isFinite(limitKw) || typeof getTariff !== 'function'
      || !Number.isFinite(legacyScaleFactor)) {
    throw new TypeError('computeCost: context and configured tariff scale must be valid');
  }

  const energyCostRs = plan.netKw.reduce((total, loadKw, step) => {
    const tariff = getTariff(step);
    if (!Number.isFinite(tariff) || tariff < 0) {
      throw new RangeError('computeCost: tariffAt must return finite non-negative Rs/kWh values');
    }
    return total + Math.max(0, loadKw) * stepHours * tariff * legacyScaleFactor;
  }, 0);
  const overloadKwSlots = plan.netKw.reduce((total, loadKw) =>
    total + Math.max(0, loadKw - limitKw),
  0);
  const overloadPenaltyRs = overloadKwSlots * CONFIG.penalties.overloadRsPerKwSlot;
  return { energyCostRs, overloadPenaltyRs, totalRs: energyCostRs + overloadPenaltyRs };
}

export function affordability(costBase, costNew, {
  capexRs = null,
  incentiveRs = null,
  daysPerYear = 365,
} = {}) {
  if (!Number.isFinite(costBase?.totalRs) || !Number.isFinite(costNew?.totalRs)) {
    throw new TypeError('affordability: both costs must have a finite totalRs');
  }
  if (!Number.isFinite(daysPerYear) || daysPerYear <= 0
      || (incentiveRs != null && (!Number.isFinite(incentiveRs) || incentiveRs < 0))) {
    throw new RangeError('affordability: incentiveRs must be non-negative and daysPerYear must be positive');
  }
  const dailySavingRs = costBase.totalRs - costNew.totalRs;
  const annualSavingRs = dailySavingRs * daysPerYear;
  if (capexRs == null) {
    return { dailySavingRs, annualSavingRs, paybackYears: null, status: 'NEEDS_INPUT: capex not provided' };
  }
  if (!Number.isFinite(capexRs) || capexRs < 0) {
    throw new RangeError('affordability: capexRs must be a non-negative finite number or null');
  }
  const netCapexRs = capexRs - (incentiveRs ?? 0);
  return {
    dailySavingRs,
    annualSavingRs,
    paybackYears: annualSavingRs > 0 ? +(netCapexRs / annualSavingRs).toFixed(2) : null,
    status: 'OK',
  };
}

/** Costs a daily (or repeated daily) net-load series expressed in kW. */
export function costFor(netKw, limitKw = CONFIG.feeder.limitKw) {
  if (!Array.isArray(netKw) || netKw.some((value) => !Number.isFinite(value))) {
    throw new TypeError('costFor: netKw must be an array of finite numbers');
  }

  return netKw.reduce((total, loadKw, step) => {
    const energyCostRs = Math.max(0, loadKw)
      * CONFIG.timing.stepHours
      * tariffAt(step)
      * CONFIG.tariff.legacyScaleFactor;
    const overloadPenaltyRs = Math.max(0, loadKw - limitKw) * CONFIG.penalties.overloadRsPerKwSlot;
    return total + energyCostRs + overloadPenaltyRs;
  }, 0);
}

export function compute_cost({
  netKw,
  limitKw = CONFIG.feeder.limitKw,
  shiftedEnergyKwh = 0,
  capexRs,
  incentiveRs,
  annualSavingsRs = null,
}) {
  if (!Array.isArray(netKw) || netKw.some((value) => !Number.isFinite(value))) {
    throw new TypeError('compute_cost: netKw must be an array of finite numbers');
  }
  if (!Number.isFinite(limitKw) || !Number.isFinite(shiftedEnergyKwh) || shiftedEnergyKwh < 0) {
    throw new RangeError('compute_cost: limitKw and shiftedEnergyKwh must be finite, with shiftedEnergyKwh non-negative');
  }

  const energyCostRs = netKw.reduce((total, loadKw, step) =>
    total + Math.max(0, loadKw)
      * CONFIG.timing.stepHours
      * tariffAt(step)
      * CONFIG.tariff.legacyScaleFactor,
  0);
  const overloadPenaltyRs = netKw.reduce((total, loadKw) =>
    total + Math.max(0, loadKw - limitKw) * CONFIG.penalties.overloadRsPerKwSlot,
  0);

  // Explicit caller values override the sourced dataset defaults.
  const resolvedCapexRs = capexRs !== undefined
    ? capexRs
    : CONFIG.battery.capexRsPerKwh == null
      ? null
      : CONFIG.battery.capexRsPerKwh * CONFIG.battery.capacityKwh;
  const resolvedIncentiveRs = incentiveRs !== undefined
    ? incentiveRs
    : CONFIG.incentive.rsPerKwhShifted == null
      ? null
      : CONFIG.incentive.rsPerKwhShifted * shiftedEnergyKwh;
  const validCapex = resolvedCapexRs == null || (Number.isFinite(resolvedCapexRs) && resolvedCapexRs >= 0);
  const validIncentive = resolvedIncentiveRs == null
    || (Number.isFinite(resolvedIncentiveRs) && resolvedIncentiveRs >= 0);
  if (!validCapex || !validIncentive) {
    throw new RangeError('compute_cost: capexRs and incentiveRs must be finite non-negative values or null');
  }

  return {
    energyCostRs,
    overloadPenaltyRs,
    operatingCostRs: energyCostRs + overloadPenaltyRs - (resolvedIncentiveRs ?? 0),
    capexRs: resolvedCapexRs,
    incentiveRs: resolvedIncentiveRs,
    paybackYears: resolvedCapexRs != null && Number.isFinite(annualSavingsRs) && annualSavingsRs > 0
      ? resolvedCapexRs / annualSavingsRs
      : null,
    status: resolvedCapexRs == null || !Number.isFinite(annualSavingsRs) || annualSavingsRs <= 0
      ? 'NEEDS_INPUT'
      : 'READY',
  };
}

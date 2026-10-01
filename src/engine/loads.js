import { LOAD_ARCHETYPES } from './config.js';

/**
 * Explicit per-load flexibility object (spec §4).
 * baselineKw[t]  : unmanaged demand per step.
 * Only baselineKw * flexibleFraction * participation is movable, and only if
 * criticality !== 'critical' and !optedOut.
 */
export function makeLoad({
  id, type, baselineKw, optedOut = false, outflowLPerStep = null, ...overrides
}) {
  const a = { ...LOAD_ARCHETYPES[type], ...overrides };
  if (!LOAD_ARCHETYPES[type] && !overrides.powerKw) throw new Error(`Unknown load type ${type}`);
  const tank = a.tank ? { ...a.tank, outflowLPerStep } : null;
  return {
    id, type, optedOut,
    powerKw: a.powerKw,
    flexibleFraction: a.flexibleFraction,
    earliestStart: a.earliestStart,
    latestEnd: a.latestEnd,
    deadline: a.deadline ?? null,
    maxShiftSteps: a.maxShiftSteps,
    criticality: a.criticality,
    comfort: a.comfort ?? null,
    tank,
    baselineKw: [...baselineKw],
  };
}

export function isShiftable(load) {
  return load.criticality !== 'critical' && !load.optedOut && load.flexibleFraction > 0;
}

/** Tank constraint: level must stay within [minL, capacityL] after every step. */
export function tankFeasible(load, schedKw, dtH) {
  if (!load.tank) return true;
  const { initL, minL, capacityL, litersPerKwh, outflowLPerStep } = load.tank;
  let lvl = initL;
  for (let t = 0; t < schedKw.length; t++) {
    lvl += schedKw[t] * dtH * litersPerKwh - outflowLPerStep[t];
    if (lvl < minL - 1e-9 || lvl > capacityL + 1e-9) return false;
  }
  return true;
}

import { forecast } from './forecast.js';
import { run_baselines as runBaselines, buildStrategyBaselines } from './baselines.js';
import { computeAllKpis, computeKpis, calculateKpis } from './kpis.js';
import { compute_cost, computeCost, affordability, costFor, tariffAt } from './cost.js';

export { forecast, runBaselines, computeAllKpis };
export const run_baselines = runBaselines;
export const compute_kpis = computeAllKpis;

// Compatibility exports used by the existing engine and cost callers.
export { buildStrategyBaselines, computeKpis, calculateKpis };
export { compute_cost, computeCost, affordability, costFor, tariffAt };

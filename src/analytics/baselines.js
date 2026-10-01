/* PROTOTYPE ASSUMPTION: solve is synchronous and accepts one options object. */
function toPlainJson(value) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('run_baselines: solver must return a JSON-serializable value');
  return JSON.parse(serialized);
}

export function run_baselines(solve, params) {
  if (typeof solve !== 'function') throw new TypeError('run_baselines: solve must be a function');
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new TypeError('run_baselines: params must be an object');
  }
  if (!params.forecast || !Number.isFinite(params.forecast.maxBandKw)) {
    throw new TypeError('run_baselines: params.forecast.maxBandKw must be finite');
  }

  const forecastBandKw = params.forecast.maxBandKw;
  const strategies = [
    ['No Control', { batteryEnabled: false, loadShiftEnabled: false }],
    ['Battery Only', { batteryEnabled: true, loadShiftEnabled: false }],
    ['Load Shift Only', { batteryEnabled: false, loadShiftEnabled: true }],
    ['Combined', { batteryEnabled: true, loadShiftEnabled: true }],
  ];
  const results = {};

  for (const [name, flags] of strategies) {
    const solverParams = toPlainJson(params);
    // Support the solver shape in the original proposal (`options`) and the
    // current engine's flat flags. The selected flags override caller defaults.
    solverParams.options = { ...(solverParams.options ?? {}), ...flags };
    solverParams.forecastBandKw = forecastBandKw;
    solverParams.options.forecastBandKw = forecastBandKw;
    solverParams.batteryEnabled = flags.batteryEnabled;
    solverParams.loadShiftEnabled = flags.loadShiftEnabled;
    solverParams.strategy = name;

    const solved = solve(solverParams);
    if (solved && typeof solved.then === 'function') {
      throw new TypeError('run_baselines: solve must be synchronous to return plain JSON');
    }
    if (!solved || typeof solved !== 'object' || Array.isArray(solved)) {
      throw new TypeError('run_baselines: solve must return an object for each strategy');
    }
    results[name] = toPlainJson(solved);
  }

  return results;
}

/* Compatibility adapter for the existing dashboard, which supplies solveCore separately. */
function isSafe(protectionSummary) {
  return protectionSummary.thermalCompliant
    && protectionSummary.voltageCompliant
    && protectionSummary.batterySoCCompliant
    && protectionSummary.slaCompliant;
}

function toComparisonRow(name, color, result) {
  const { kpis, protectionSummary } = result;
  return {
    name,
    overload: kpis.optimizedMaxOverloadMW > 0
      ? `+${kpis.optimizedMaxOverloadMW.toFixed(2)} MW Overload`
      : '0.00 MW Overload',
    minVoltage: `${kpis.optimizedMinVoltage.toFixed(3)} p.u.`,
    violations: `${kpis.optimizedViolationCount} Breaches`,
    cost: `₹${kpis.optimizedDailyCostRs.toLocaleString('en-IN')}/day`,
    status: isSafe(protectionSummary) ? 'SAFE' : 'INFEASIBLE',
    color,
  };
}

export function buildStrategyBaselines({
  solveCore,
  scenarioId,
  participationRate,
  batteryInitialSoC,
  feederCapacityMW,
  batteryCapacityMWh,
  batteryMaxPowerMW,
  result,
}) {
  const common = { scenarioId, batteryInitialSoC, feederCapacityMW, batteryCapacityMWh, batteryMaxPowerMW };
  const strategies = [
    ['1. Do Nothing (Unmanaged Base)', { batteryEnabled: false, participationRate: 0, loadShiftEnabled: false }, '#f87171'],
    ['2. Battery-Only (BESS Alone)', { batteryEnabled: true, participationRate: 0, loadShiftEnabled: false }, '#fbbf24'],
    ['3. Load-Shift-Only (DR Alone)', { batteryEnabled: false, participationRate, loadShiftEnabled: true }, '#fbbf24'],
  ];

  return [
    ...strategies.map(([name, options, color]) =>
      toComparisonRow(name, color, solveCore({ ...common, ...options })),
    ),
    toComparisonRow('4. GridFlex Configured Plan', '#34d399', result),
  ];
}

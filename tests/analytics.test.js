/*
 * Hand checks (stepHours = 0.5):
 * - Forecast: the two days [10,20], [12,24] produce [12,24]; the configured
 *   350 kW band dominates the 2/4 kW residuals, then grows by horizonGrowth/2.
 * - KPI: a 5,000 kW baseline peak reduced to 4,500 kW is 10%; one 4,500 kW
 *   step exceeds the 4,200 kW limit for 0.5 hours. Curtailment is 20*0.5=10
 *   kWh. Discharge is 100 kWh / (1,500*(0.95-0.20))=0.088888... cycles.
 *   Shifted energy is (20+10)*0.5=15 kWh; at comfort weight 2, discomfort=30.
 *   Directional loss reduction is 1-(4,500/5,000)^2=0.19.
 * - Cost: [1,000,5,000] kW costs 325 + 1,625 energy Rs, plus
 *   (5,000-4,200)*1.45=1,160 overload Rs; total=3,110 Rs.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/engine/config.js';
import { effectiveReserveSoc } from '../src/engine/dispatch.js';
import {
  computeAllKpis,
  compute_cost,
  computeCost,
  affordability,
  compute_kpis,
  computeKpis,
  forecast,
  run_baselines,
} from '../src/analytics/index.js';

test('two flat days forecast 12 kW at every step with a zero-residual base band', () => {
  const historyKw = [...Array(48).fill(10), ...Array(48).fill(12)];
  const result = forecast({ historyKw });

  assert.deepEqual(result.forecastKw, Array(48).fill(12));
  // Each day-over-day residual is exactly 2 kW, so residual std is zero.
  // The first step is un-grown and therefore equals the configured band floor.
  assert.equal(result.bandKw[0], CONFIG.forecast.baseBandKw);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('run_baselines evaluates four strategies with one scenario, seed, and forecast band', () => {
  const calls = [];
  const params = {
    scenarioId: 'cloud_event',
    seed: 73,
    forecast: { maxBandKw: 600, method: 'seasonal-naive' },
  };
  const solve = (options) => {
    calls.push(options);
    const extraReserve = Math.min(
      CONFIG.uncertaintyReserve.maxExtraSoc,
      CONFIG.uncertaintyReserve.gain * options.forecastBandKw / CONFIG.feeder.limitKw,
    );
    return {
      scenarioId: options.scenarioId,
      seed: options.seed,
      strategy: options.strategy,
      forecastBandKw: options.forecastBandKw,
      reserveSoc: Math.min(CONFIG.battery.maxSoc - 0.05, CONFIG.battery.minReserveSoc + extraReserve),
    };
  };

  const result = run_baselines(solve, params);
  const names = ['No Control', 'Battery Only', 'Load Shift Only', 'Combined'];

  assert.deepEqual(Object.keys(result), names);
  assert.deepEqual(calls.map((call) => call.strategy), names);
  for (const call of calls) {
    assert.equal(call.scenarioId, params.scenarioId);
    assert.equal(call.seed, params.seed);
    assert.equal(call.forecastBandKw, params.forecast.maxBandKw);
    assert.deepEqual(call.forecast, params.forecast);
    assert.equal(call.options.forecastBandKw, params.forecast.maxBandKw);
  }
  assert.equal(calls[0].batteryEnabled, false);
  assert.equal(calls[0].loadShiftEnabled, false);
  assert.equal(calls[1].batteryEnabled, true);
  assert.equal(calls[1].loadShiftEnabled, false);
  assert.equal(calls[2].batteryEnabled, false);
  assert.equal(calls[2].loadShiftEnabled, true);
  assert.equal(calls[3].batteryEnabled, true);
  assert.equal(calls[3].loadShiftEnabled, true);
  assert.deepEqual(calls.map(({ options }) => [options.batteryEnabled, options.loadShiftEnabled]), [
    [false, false], [true, false], [false, true], [true, true],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('a larger forecast band gives the solver a larger configured battery reserve', () => {
  const lowReserve = effectiveReserveSoc(100, CONFIG.feeder.limitKw);
  const highReserve = effectiveReserveSoc(600, CONFIG.feeder.limitKw);

  assert.ok(highReserve > lowReserve);
});

test('three-step KPI example matches hand calculations', () => {
  const baseline = { netKw: [4, 5, 4] };
  const plan = { netKw: [4, 4, 4] };
  const metrics = computeKpis(plan, baseline, {
    limitKw: 4.5,
    stepHours: 0.5,
    usableBatteryKwh: 1,
  });

  assert.equal(metrics.peakReductionPct, 20);
  assert.deepEqual(metrics.overloadHours, { baseline: 0.5, new: 0 });
  assert.ok(Math.abs(metrics.lossReductionDirectional - 0.36) < 1e-12);
});

test('compute_kpis returns hand-verified comparisons against No Control', () => {
  const baselines = {
    'No Control': { netKw: [5000, 4000, 3000] },
    Combined: {
      netKw: [3000, 4500, 2500],
      solarKw: [100, 100, 100],
      solarUsedKw: [100, 80, 100],
      batteryDischargeKw: [0, 100, 100],
      shiftedKwh: [15],
      unservedKwh: [2.5],
    },
  };
  const metrics = compute_kpis(baselines, { limitKw: 4200, stepHours: 0.5, usableBatteryKwh: 1125 });

  assert.equal(metrics.Combined.peakReductionPct, 10);
  assert.deepEqual(metrics.Combined.overloadHours, { baseline: 0.5, new: 0.5 });
  assert.equal(metrics.Combined.unservedEnergyKwh, 2.5);
  assert.equal(metrics.Combined.curtailmentKwh, 10);
  assert.equal(metrics.Combined.batteryCycles, 0.089);
  assert.equal(metrics.Combined.discomfortKwh, 15);
  assert.ok(Math.abs(metrics.Combined.lossReductionDirectional - 0.19) < 1e-12);
  assert.match(metrics.Combined.lossReductionLabel, /Directional I²R.*not a power-flow calculation/);
  assert.deepEqual(JSON.parse(JSON.stringify(metrics)), metrics);
});

test('computeKpis compares direct plan arrays and computeAllKpis uses No Control', () => {
  const baseline = { netKw: [5000, 4000, 3000] };
  const plan = {
    netKw: [3000, 4500, 2500],
    solarKw: [100, 100, 100],
    solarUsedKw: [100, 80, 100],
    batteryDischargeKw: [0, 100, 100],
    shiftedKwh: [15],
    unservedKwh: [2.5],
  };
  const ctx = { limitKw: 4200, stepHours: 0.5, usableBatteryKwh: 1125 };
  const result = computeKpis(plan, baseline, ctx);

  assert.equal(result.peakReductionPct, 10);
  assert.deepEqual(result.overloadHours, { baseline: 0.5, new: 0.5 });
  assert.equal(result.unservedEnergyKwh, 2.5);
  assert.equal(result.curtailmentKwh, 10);
  assert.equal(result.batteryCycles, 0.089);
  assert.equal(result.discomfortKwh, 15);
  assert.ok(Math.abs(result.lossReductionDirectional - 0.19) < 1e-12);
  assert.equal(computeAllKpis({ 'No Control': baseline, Combined: plan }, ctx).Combined.peakReductionPct, 10);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('cost uses configured tariffs and overload penalties; unknown capex stays unset', () => {
  const result = compute_cost({ netKw: [1000, 5000] });

  assert.equal(result.energyCostRs, 1950);
  assert.equal(result.overloadPenaltyRs, 1160);
  assert.equal(result.operatingCostRs, 3110);
  assert.equal(result.capexRs, null);
  assert.equal(result.incentiveRs, null);
  assert.equal(result.paybackYears, null);
  assert.equal(result.status, 'NEEDS_INPUT');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('computeCost accepts a tariff context and affordability leaves missing capex unset', () => {
  const plan = { netKw: [1000, 5000] };
  const cost = computeCost(plan, { stepHours: 0.5, limitKw: 4200, tariffAt: () => 10 });
  assert.equal(cost.energyCostRs, 3000);
  assert.equal(cost.overloadPenaltyRs, 1160);
  assert.equal(cost.totalRs, 4160);

  const base = { totalRs: 4160 };
  const next = { totalRs: 3110 };
  const unknown = affordability(base, next);
  assert.equal(unknown.dailySavingRs, 1050);
  assert.equal(unknown.paybackYears, null);
  assert.equal(unknown.status, 'NEEDS_INPUT: capex not provided');
  assert.equal(affordability(base, next, { capexRs: 10000 }).status, 'OK');
  assert.throws(() => computeCost(plan, { tariffAt: () => Number.NaN }), /tariffAt must return/);
  assert.throws(() => affordability(base, next, { daysPerYear: 0 }), /daysPerYear must be positive/);
});

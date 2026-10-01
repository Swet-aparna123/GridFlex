import assert from 'node:assert/strict';
import test from 'node:test';
import { solveGridFlex } from '../src/engine/gridflexEngine.js';

test('normal feeder starts within the modeled thermal and voltage limits', () => {
  const result = solveGridFlex({ scenarioId: 'normal' });

  assert.equal(result.kpis.baselineMaxOverloadMW, 0);
  assert.ok(result.kpis.baselineMinVoltage >= 0.95);
  assert.ok(result.kpis.baselineMaxVoltage <= 1.05);
  assert.equal(result.protectionSummary.thermalCompliant, true);
  assert.equal(result.protectionSummary.voltageCompliant, true);
  assert.equal(result.kpis.peakShavedMW, 0);
  assert.equal(result.kpis.totalBessDischargedMWh, 0);
  assert.equal(result.kpis.totalShiftedLoadMWh, 0);
});

test('evening peak plan meets the modeled protection limits', () => {
  const result = solveGridFlex({ scenarioId: 'evening_peak' });
  const { protectionSummary, kpis } = result;

  assert.equal(protectionSummary.thermalCompliant, true);
  assert.equal(protectionSummary.voltageCompliant, true);
  assert.equal(protectionSummary.batterySoCCompliant, true);
  assert.equal(protectionSummary.slaCompliant, true);
  assert.equal(kpis.optimizedViolationCount, 0);
  assert.ok(kpis.optPeakMW < kpis.baselinePeakMW);
  assert.ok(kpis.dailySavingsRs > 0);
  assert.ok(Math.abs(kpis.dailySavingsRs - (kpis.baselineDailyCostRs - kpis.optimizedDailyCostRs)) <= 1);
});

test('limited flexibility reports the unmet feeder stress instead of capping it', () => {
  const result = solveGridFlex({
    scenarioId: 'evening_peak',
    batteryEnabled: false,
    participationRate: 10,
  });

  assert.ok(result.kpis.optPeakMW > 4.2);
  assert.ok(result.kpis.optimizedViolationCount > 0);
  assert.equal(result.protectionSummary.thermalCompliant, false);
  assert.equal(result.protectionSummary.voltageCompliant, false);
  assert.notEqual(result.kpis.dailySavingsRs, 21700);
});

test('solar surge uses curtailment to keep modeled voltage within bounds', () => {
  const result = solveGridFlex({ scenarioId: 'solar_surge' });

  assert.ok(result.timeSeries.some((slot) => slot.solarCurtailmentMW > 0));
  assert.equal(result.protectionSummary.voltageCompliant, true);
  assert.equal(result.kpis.optimizedViolationCount, 0);
});

test('an explicit forecast band controls the dispatch reserve', () => {
  const lowBand = solveGridFlex({
    scenarioId: 'evening_peak',
    forecastBandKw: 100,
    includeStrategyBaselines: false,
  });
  const highBand = solveGridFlex({
    scenarioId: 'evening_peak',
    forecastBandKw: 600,
    includeStrategyBaselines: false,
  });

  assert.equal(lowBand.forecast.dispatchBandKw, 100);
  assert.equal(highBand.forecast.dispatchBandKw, 600);
  assert.ok(highBand.forecast.reserveSoc > lowBand.forecast.reserveSoc);
});

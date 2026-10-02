import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/engine/config.js';
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

test('solar surge absent from ordinary history is reported as forecast error', () => {
  const result = solveGridFlex({ scenarioId: 'solar_surge' });

  const actualNetKw = result.timeSeries.map((slot) => slot.baselineNetLoad * 1000);
  assert.ok(result.forecast.mapePct > 0, 'ordinary history does not contain the target solar surge');
  assert.ok(result.forecast.bandCoveragePct < 100, 'the surprise can fall outside the historical band');
  assert.ok(result.forecast.reverseFlowGapKwhEquivalent > 0, 'the unforecast reverse-flow constraint is reported');
  assert.notDeepEqual(result.forecast.forecastKw, actualNetKw);
});

test('risk-window forecast bands produce distinct scenario reserves', () => {
  const evening = solveGridFlex({ scenarioId: 'evening_peak', includeStrategyBaselines: false });
  const cloud = solveGridFlex({ scenarioId: 'cloud_event', includeStrategyBaselines: false });
  const normal = solveGridFlex({ scenarioId: 'normal', includeStrategyBaselines: false });

  assert.notEqual(evening.forecast.reserveSoc, cloud.forecast.reserveSoc);
  assert.notEqual(normal.forecast.reserveSoc, cloud.forecast.reserveSoc);
  for (const result of [normal, evening, cloud]) {
    assert.ok(result.forecast.reserveSoc >= 0.25 && result.forecast.reserveSoc <= 0.4);
    assert.ok(result.forecast.reserveSoc < CONFIG.battery.minReserveSoc + CONFIG.uncertaintyReserve.maxExtraSoc,
      'scenario reserve does not always hit the configured cap');
    assert.ok(result.forecast.mapePct > 0);
  }
  assert.ok(cloud.forecast.shortfallKwh > 0, 'unforecast cloud stress is measured against actual demand');
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

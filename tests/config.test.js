import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG, PROVENANCE } from '../src/engine/config.js';
import { lossReductionDirectional } from '../src/engine/dispatch.js';
import assumptions from '../src/data/assumptions.json' with { type: 'json' };
import archetypes from '../src/data/archetypes.json' with { type: 'json' };
import archetypeShapes from '../src/data/archetypeShapes.json' with { type: 'json' };

const leaves = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? leaves(v, `${p}${k}.`) : [`${p}${k}`]);

test('every config leaf has a source or PROTOTYPE ASSUMPTION label', () => {
  for (const path of leaves(CONFIG)) assert.ok(PROVENANCE[path], `missing provenance: ${path}`);
});

test('loss estimate is exactly 1-(new/old)^2', () => {
  assert.ok(Math.abs(lossReductionDirectional(5, 4) - 0.36) < 1e-12);
  assert.equal(lossReductionDirectional(0, 0), 0);
});

test('converted CSV data is typed JSON and supplies the configured assumptions', () => {
  assert.equal(archetypes.length, 6);
  assert.equal(archetypeShapes.length, 48);
  assert.equal(archetypeShapes[47].slot_index, 47);
  assert.equal(CONFIG.battery.capexRsPerKwh, assumptions.battery_capex_rs_per_kwh.value);
  assert.equal(CONFIG.emissions.gridKgCo2PerKwh, assumptions.grid_co2_factor_kg_per_kwh_cea_fy2025_26.value);
  assert.equal(CONFIG.capital.capexDeferralRsPerKwPeak, assumptions.capex_deferral_rs_per_kw_peak.value);
});

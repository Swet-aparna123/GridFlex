import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG, PROVENANCE } from '../src/engine/config.js';
import { lossReductionDirectional } from '../src/engine/dispatch.js';

const leaves = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? leaves(v, `${p}${k}.`) : [`${p}${k}`]);

test('every config leaf has a source or PROTOTYPE ASSUMPTION label', () => {
  for (const path of leaves(CONFIG)) assert.ok(PROVENANCE[path], `missing provenance: ${path}`);
});

test('loss estimate is exactly 1-(new/old)^2', () => {
  assert.ok(Math.abs(lossReductionDirectional(5, 4) - 0.36) < 1e-12);
  assert.equal(lossReductionDirectional(0, 0), 0);
});

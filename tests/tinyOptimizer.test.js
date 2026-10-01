/**
 * Spec §12 tiny test: 3 loads, 1 battery, 6 one-hour steps. Numbers verified by hand.
 *
 * limit = 40 kW, solar = 0, base (uncontrollable) = [20,20,30,30,20,20]
 *   rickshaw (10 kW rated, flexible, deadline step 5, max shift 3): [0,0,10,10,0,0]
 *   pump     (8 kW rated, tank 120 L cap / 20 L min / 100 L start, 10 L/kWh, 20 L/step out, max shift 2): [0,0,8,0,0,0]
 *   fridge   (critical, 4 kW constant, flexibleFraction deliberately 0.5 to prove it is ignored)
 * Baseline net = [24,24,52,44,24,24]  -> overload 12 kW at t2, 4 kW at t3.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/engine/config.js';
import { makeLoad } from '../src/engine/loads.js';
import { optimize, effectiveReserveSoc } from '../src/engine/dispatch.js';

const cfg = structuredClone(CONFIG);
cfg.timing.stepHours = 1;
cfg.uncertaintyReserve = { gain: 0.4, maxExtraSoc: 0.20 };

const mkLoads = () => [
  makeLoad({ id: 'rick', type: 'e_rickshaw', baselineKw: [0, 0, 10, 10, 0, 0],
    powerKw: 10, earliestStart: 0, latestEnd: 5, deadline: 5, maxShiftSteps: 3 }),
  makeLoad({ id: 'pump', type: 'water_pump', baselineKw: [0, 0, 8, 0, 0, 0],
    powerKw: 8, earliestStart: 0, latestEnd: 5, maxShiftSteps: 2,
    tank: { capacityL: 120, minL: 20, initL: 100, litersPerKwh: 10 },
    outflowLPerStep: Array(6).fill(20) }),
  makeLoad({ id: 'fridge', type: 'critical', baselineKw: Array(6).fill(4), flexibleFraction: 0.5 }),
];
const base = [20, 20, 30, 30, 20, 20];
const solar = Array(6).fill(0);
const batt = { ...CONFIG.battery, capacityKwh: 40, maxSoc: 1.0, minReserveSoc: 0.20,
  maxChargeKw: 0, maxDischargeKw: 15, roundTripEfficiency: 1.0 };
const sum = (a) => a.reduce((x, y) => x + y, 0);

test('baseline matches hand calculation', () => {
  const p = optimize({ baseKw: base, solarKw: solar, loads: mkLoads(), limitKw: 40, battery: batt,
    options: { batteryEnabled: false, loadShiftEnabled: false }, config: cfg });
  assert.deepEqual(p.netAfter, [24, 24, 52, 44, 24, 24]);
});

test('load shift only: moves 10kW rickshaw t2->t4, 2kW pump t2->t4, 4kW rickshaw t3->t5', () => {
  const p = optimize({ baseKw: base, solarKw: solar, loads: mkLoads(), limitKw: 40, battery: batt,
    options: { batteryEnabled: false, loadShiftEnabled: true, participationRate: 1 }, config: cfg });
  // hand-derived result
  assert.deepEqual(p.netAfter, [24, 24, 40, 40, 36, 28]);
  const key = (m) => `${m.loadId}:${m.fromStep}>${m.toStep}:${m.kw}`;
  assert.deepEqual(p.moves.map(key).sort(), ['pump:2>4:2', 'rick:2>4:10', 'rick:3>5:4'].sort());
  // energy conserved per load, critical untouched, limit respected
  const rick = p.schedules.find((s) => s.id === 'rick').sched;
  assert.equal(sum(rick), 20);
  assert.deepEqual(p.schedules.find((s) => s.id === 'fridge').sched, Array(6).fill(4));
  assert.equal(p.metrics.overloadStepsAfter, 0);
  assert.equal(p.validation.allHardConstraintsPass, true);
});

test('battery only (SoC 30 kWh, reserve 8 kWh): discharges 12 kW @t2 and 4 kW @t3, SoC ends 14', () => {
  const p = optimize({ baseKw: base, solarKw: solar, loads: mkLoads(), limitKw: 40, battery: batt,
    options: { batteryEnabled: true, loadShiftEnabled: false, initialSocKwh: 30 }, config: cfg });
  assert.deepEqual(p.battery.dischargeKw, [0, 0, 12, 4, 0, 0]);
  assert.deepEqual(p.netAfter, [24, 24, 40, 40, 24, 24]);
  assert.equal(p.battery.socKwh[5], 14);
  assert.ok(Math.min(...p.battery.socKwh) >= 8);
  assert.ok(Math.max(...p.battery.dischargeKw) <= 15);
});

test('pump cannot be delayed past what the tank allows', () => {
  const loads = mkLoads();
  loads[1].maxShiftSteps = 4; // tank, not max-shift, should now be the binding rule
  const p = optimize({ baseKw: [20, 20, 70, 20, 20, 20], solarKw: solar, loads: [loads[1], loads[2]],
    limitKw: 40, battery: batt, options: { batteryEnabled: false, loadShiftEnabled: true }, config: cfg });
  const pump = p.schedules.find((s) => s.id === 'pump').sched;
  assert.equal(pump[5], 0);      // delaying to t5 would drain the tank below 20 L
  assert.equal(p.validation.checks.tankLimits, true);
});

test('§14 high forecast uncertainty raises reserve and reduces battery dispatch', () => {
  const run = (band) => optimize({ baseKw: base, solarKw: solar, loads: mkLoads(), limitKw: 40, battery: batt,
    options: { batteryEnabled: true, loadShiftEnabled: false, initialSocKwh: 20, forecastBandKw: band }, config: cfg });
  const low = run(0), high = run(20);
  assert.equal(effectiveReserveSoc(0, 40, cfg), 0.20);
  assert.equal(effectiveReserveSoc(20, 40, cfg), 0.40);   // 0.20 + min(0.20, 0.4*0.5)
  assert.equal(low.metrics.batteryDischargedKwh, 12);     // 20 - 8 reserve
  assert.equal(high.metrics.batteryDischargedKwh, 4);     // 20 - 16 reserve
  assert.ok(Math.min(...high.battery.socKwh) >= 16);
  assert.ok(high.metrics.unservedKwh > low.metrics.unservedKwh);
});

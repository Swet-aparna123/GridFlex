import { CONFIG } from './config.js';
import { isShiftable, tankFeasible } from './loads.js';

const EPS = 1e-6;
const RANK = { low: 0, medium: 1, high: 2, critical: 3 };

/** §14: higher forecast uncertainty => higher battery reserve (changes the optimizer, not just the chart). */
export function effectiveReserveSoc(forecastBandKw, limitKw, cfg = CONFIG) {
  const rel = limitKw > 0 ? forecastBandKw / limitKw : 0;
  const extra = Math.min(cfg.uncertaintyReserve.maxExtraSoc, cfg.uncertaintyReserve.gain * rel);
  return Math.min(cfg.battery.maxSoc - 0.05, cfg.battery.minReserveSoc + extra);
}

/** §21: directional I^2R estimate. */
export function lossReductionDirectional(oldPeak, newPeak) {
  if (!(oldPeak > 0)) return 0;
  return Math.max(0, 1 - (newPeak / oldPeak) ** 2);
}

export function optimize({
  baseKw, solarKw, loads, limitKw,
  battery = CONFIG.battery, options = {}, config = CONFIG,
}) {
  const dt = config.timing.stepHours;
  const T = baseKw.length;
  const {
    batteryEnabled = true, loadShiftEnabled = true,
    participationRate = 1, forecastBandKw = 0, initialSocKwh = battery.initialSoc * battery.capacityKwh,
    allowAdvance = false, minNetKw = null,
  } = options;

  // working copies
  const L = loads.map((l) => {
    const part = isShiftable(l) ? participationRate : 0;
    return {
      ...l,
      sched: [...l.baselineKw],
      movable: l.baselineKw.map((k) => k * l.flexibleFraction * part),
      blocked: new Set(),
    };
  });
  const netOf = (t) => baseKw[t] - solarKw[t] + L.reduce((s, l) => s + l.sched[t], 0);
  const net = Array.from({ length: T }, (_, t) => netOf(t));
  const netBefore = [...net];
  const moves = [];

  // ---- 1. load shifting (delay-only, window/deadline/max-shift/rated/tank aware)
  if (loadShiftEnabled) {
    const order = [...L].sort((a, b) => RANK[a.criticality] - RANK[b.criticality]);
    const slots = [...Array(T).keys()].sort((a, b) => net[b] - net[a]);
    for (const s of slots) {
      for (const l of order) {
        while (net[s] - limitKw > EPS && l.movable[s] > EPS) {
          let best = -1; let bestHead = EPS;
          const first = allowAdvance ? Math.max(0, s - l.maxShiftSteps) : s + 1;
          const last = Math.min(T - 1, s + l.maxShiftSteps);
          for (let d = first; d <= last; d++) {
            if (d === s || (!allowAdvance && d < s)) continue;
            if (d < l.earliestStart || d > l.latestEnd) continue;
            if (l.deadline != null && d > l.deadline) continue;
            if (l.blocked.has(`${s}>${d}`)) continue;
            if (l.powerKw - l.sched[d] <= EPS) continue;
            const head = limitKw - net[d];
            if (head > bestHead + EPS) { best = d; bestHead = head; }
          }
          if (best < 0) break;
          let amt = Math.min(net[s] - limitKw, l.movable[s], bestHead, l.powerKw - l.sched[best]);
          let applied = 0;
          for (let k = 0; k < 6 && amt > EPS; k++, amt /= 2) {
            l.sched[s] -= amt; l.sched[best] += amt;
            if (tankFeasible(l, l.sched, dt)) { applied = amt; break; }
            l.sched[s] += amt; l.sched[best] -= amt;
          }
          if (applied <= EPS) { l.blocked.add(`${s}>${best}`); continue; }
          l.movable[s] -= applied;
          net[s] -= applied; net[best] += applied;
          moves.push({ loadId: l.id, type: l.type, fromStep: s, toStep: best, kw: applied });
        }
      }
    }

    // ---- 1b. Surplus absorption: pull flexible demand from later slots into low-net slots.
    if (Number.isFinite(minNetKw)) {
      const lowSlots = [...Array(T).keys()].sort((a, b) => net[a] - net[b]);
      for (const t of lowSlots) {
        for (const l of order) {
          while (net[t] < minNetKw - EPS) {
            let source = -1;
            let bestNet = minNetKw + EPS;
            const lastSource = Math.min(T - 1, t + l.maxShiftSteps, l.latestEnd);
            for (let d = t + 1; d <= lastSource; d++) {
              if (d < l.earliestStart || l.movable[d] <= EPS) continue;
              if (l.blocked.has(`${d}>${t}`)) continue;
              if (l.deadline != null && t > l.deadline) continue;
              if (l.powerKw - l.sched[t] <= EPS) continue;
              if (net[d] > bestNet) { source = d; bestNet = net[d]; }
            }
            if (source < 0) break;

            let amt = Math.min(
              minNetKw - net[t], l.movable[source],
              l.powerKw - l.sched[t],
            );
            let applied = 0;
            for (let k = 0; k < 6 && amt > EPS; k++, amt /= 2) {
              l.sched[source] -= amt; l.sched[t] += amt;
              if (tankFeasible(l, l.sched, dt)) { applied = amt; break; }
              l.sched[source] += amt; l.sched[t] -= amt;
            }
            if (applied <= EPS) { l.blocked.add(`${source}>${t}`); continue; }
            l.movable[source] -= applied;
            net[source] -= applied; net[t] += applied;
            moves.push({ loadId: l.id, type: l.type, fromStep: source, toStep: t, kw: applied });
          }
        }
      }
    }
  }

  // ---- 2. battery (reserve widened by forecast uncertainty)
  const reserveSoc = effectiveReserveSoc(forecastBandKw, limitKw, config);
  const cap = battery.capacityKwh;
  const reserveKwh = reserveSoc * cap;
  const maxKwh = battery.maxSoc * cap;
  const eta = Math.sqrt(battery.roundTripEfficiency);
  const chargeKw = Array(T).fill(0);
  const dischargeKw = Array(T).fill(0);
  const soc = Array(T).fill(0);
  let e = initialSocKwh;
  if (batteryEnabled) {
    const want = net.map((n) => Math.max(0, Math.min(battery.maxDischargeKw, n - limitKw)));
    for (let t = 0; t < T; t++) {
      if (want[t] > EPS) {
        const availKwh = Math.max(0, e - reserveKwh);
        const p = Math.min(want[t], availKwh * eta / dt);
        dischargeKw[t] = p; e -= p * dt / eta;
        net[t] -= p;
      } else if (Number.isFinite(minNetKw) && net[t] < minNetKw - EPS && battery.maxChargeKw > 0) {
        const surplusKw = minNetKw - net[t];
        const roomKw = Math.max(0, maxKwh - e) / (dt * eta);
        const p = Math.min(battery.maxChargeKw, surplusKw, roomKw);
        chargeKw[t] = p; e += p * dt * eta; net[t] += p;
      } else {
        const futureNeed = want.slice(t + 1).reduce((s, w) => s + w * dt / eta, 0);
        const target = Math.min(maxKwh, reserveKwh + futureNeed);
        if (e < target - EPS && battery.maxChargeKw > 0) {
          const head = Math.max(0, limitKw - net[t]);
          const p = Math.min(battery.maxChargeKw, head, (target - e) / (dt * eta));
          chargeKw[t] = p; e += p * dt * eta; net[t] += p;
        }
      }
      soc[t] = e;
    }
  } else {
    soc.fill(e);
  }

  // Curtail only the surplus left after flexible demand and battery charging.
  const solarCurtailmentKw = Array(T).fill(0);
  if (Number.isFinite(minNetKw)) {
    for (let t = 0; t < T; t++) {
      solarCurtailmentKw[t] = Math.min(Math.max(0, solarKw[t]), Math.max(0, minNetKw - net[t]));
      net[t] += solarCurtailmentKw[t];
    }
  }

  const netAfter = net;
  const unservedKwh = netAfter.reduce((s, n) => s + Math.max(0, n - limitKw) * dt, 0);
  const plan = {
    netBefore, netAfter, moves, schedules: L.map(({ id, sched }) => ({ id, sched })),
    battery: { chargeKw, dischargeKw, socKwh: soc, reserveSoc, reserveKwh, initialKwh: initialSocKwh },
    metrics: {
      peakBeforeKw: Math.max(...netBefore), peakAfterKw: Math.max(...netAfter),
      unservedKwh,
      overloadStepsBefore: netBefore.filter((n) => n > limitKw + EPS).length,
      overloadStepsAfter: netAfter.filter((n) => n > limitKw + EPS).length,
      batteryDischargedKwh: dischargeKw.reduce((s, p) => s + p * dt, 0),
      curtailedKwh: solarCurtailmentKw.reduce((s, p) => s + p * dt, 0),
      shiftedKwh: moves.reduce((s, m) => s + m.kw * dt, 0),
    },
    solarCurtailmentKw,
  };
  plan.validation = validatePlan(plan, { loads, limitKw, battery, dt, config, minNetKw });
  return plan;
}

/** §17: single final check of the hard constraints, independent of the solver loop. */
export function validatePlan(plan, { loads, battery, dt, minNetKw = null }) {
  const byId = Object.fromEntries(plan.schedules.map((s) => [s.id, s.sched]));
  const checks = { energyConserved: true, criticalUntouched: true, optOutsExcluded: true,
    windowsAndDeadlines: true, ratedPower: true, tankLimits: true,
    batteryReserve: true, batteryRates: true, noSimultaneousChargeDischarge: true,
    voltageSafe: !Number.isFinite(minNetKw) || plan.netAfter.every((value) => value >= minNetKw - EPS) };
  for (const l of loads) {
    const s = byId[l.id];
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    if (Math.abs(sum(s) - sum(l.baselineKw)) > 1e-6) checks.energyConserved = false;
    if (l.criticality === 'critical' && s.some((v, t) => Math.abs(v - l.baselineKw[t]) > 1e-9)) checks.criticalUntouched = false;
    if (l.optedOut && s.some((v, t) => Math.abs(v - l.baselineKw[t]) > 1e-9)) checks.optOutsExcluded = false;
    s.forEach((v, t) => {
      if (v > l.powerKw + 1e-6 && v > l.baselineKw[t] + 1e-6) checks.ratedPower = false;
      if (v > l.baselineKw[t] + 1e-9 && (t < l.earliestStart || t > l.latestEnd || (l.deadline != null && t > l.deadline))) checks.windowsAndDeadlines = false;
    });
    if (!tankFeasible(l, s, dt)) checks.tankLimits = false;
  }
  for (const m of plan.moves) {
    const l = loads.find((x) => x.id === m.loadId);
    if (Math.abs(m.toStep - m.fromStep) > l.maxShiftSteps) checks.windowsAndDeadlines = false;
  }
  const b = plan.battery;
  if (b.socKwh.some((e) => e < Math.min(b.reserveKwh, b.initialKwh) - 1e-6 || e > battery.maxSoc * battery.capacityKwh + 1e-6)) checks.batteryReserve = false;
  if (b.chargeKw.some((p) => p > battery.maxChargeKw + 1e-6) || b.dischargeKw.some((p) => p > battery.maxDischargeKw + 1e-6)) checks.batteryRates = false;
  if (b.chargeKw.some((p, t) => p > 1e-9 && b.dischargeKw[t] > 1e-9)) checks.noSimultaneousChargeDischarge = false;
  const feederLimit = { residualOverloadSteps: plan.metrics.overloadStepsAfter, pass: plan.metrics.overloadStepsAfter === 0 };
  return { checks, allHardConstraintsPass: Object.values(checks).every(Boolean), feederLimit };
}

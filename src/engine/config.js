/**
 * GridFlex central configuration (spec §6).
 * Units: kW, kWh, hours, Rs. Time-of-day fields are step indices (0..47, 30-min steps).
 * EVERY leaf under CONFIG must have an entry in PROVENANCE (enforced by tests/config.test.js).
 * Values below are copied from the previous inline constants in gridflexEngine.js;
 * none of them is sourced from a tariff order or vendor quote yet.
 */
const P = 'PROTOTYPE ASSUMPTION';

export const CONFIG = {
  timing: { stepHours: 0.5, stepsPerDay: 48 },
  feeder: { limitKw: 4200, plannedLoadingFraction: 0.85 },
  battery: {
    enabled: true,
    capacityKwh: 1500,
    initialSoc: 0.75,
    minReserveSoc: 0.20,
    maxSoc: 0.95,
    maxChargeKw: 750,
    maxDischargeKw: 750,
    roundTripEfficiency: 0.94,
    degradationRsPerKwhThroughput: 0, // set when a vendor cycle-life/price is chosen
    capexRsPerKwh: null,              // intentionally unset: no invented cost figures (§6)
  },
  participation: { defaultRate: 0.65 },
  loadRatings: { recoveryHeadroomFactor: 1.5 },
  incentive: { rsPerKwhShifted: null }, // intentionally unset until sourced
  tariff: {
    peakRsPerKwh: 9.5, middayRsPerKwh: 4.0, offPeakRsPerKwh: 6.5,
    peakFromHour: 17, peakToHour: 22, middayFromHour: 10, middayToHour: 15,
    legacyScaleFactor: 0.1, // engine used tariff/10 - decide if intentional
  },
  penalties: { overloadRsPerKwSlot: 1.45 },
  forecast: {
    // Band grows with horizon: sigma(t) = baseBandKw * (1 + horizonGrowth * t/stepsPerDay)
    z: 1.28,
    baseBandKw: 350,
    horizonGrowth: 1.0,
  },
  uncertaintyReserve: {
    // extraReserveSoc = min(maxExtraSoc, gain * (bandKw / feederLimitKw))
    gain: 1.5,
    maxExtraSoc: 0.20,
  },
  loss: {
    formula: '1 - (newPeak/oldPeak)^2',
    label: 'Directional estimate from the I^2R assumption; not a power-flow calculation.',
  },
};

export const PROVENANCE = {
  'timing.stepHours': P, 'timing.stepsPerDay': P,
  'feeder.limitKw': `${P} (previously 4.2 MW inline)`,
  'feeder.plannedLoadingFraction': `${P} (previously 0.85 inline)`,
  'battery.enabled': P, 'battery.capacityKwh': `${P} (1.5 MWh inline)`,
  'battery.initialSoc': P, 'battery.minReserveSoc': P, 'battery.maxSoc': P,
  'battery.maxChargeKw': P, 'battery.maxDischargeKw': P,
  'battery.roundTripEfficiency': P,
  'battery.degradationRsPerKwhThroughput': `${P} (placeholder 0)`,
  'battery.capexRsPerKwh': `${P} (unset)`,
  'participation.defaultRate': P,
  'loadRatings.recoveryHeadroomFactor': `${P} (aggregate recovery rating margin)`,
  'incentive.rsPerKwhShifted': `${P} (unset)`,
  'tariff.peakRsPerKwh': P, 'tariff.middayRsPerKwh': P, 'tariff.offPeakRsPerKwh': P,
  'tariff.peakFromHour': P, 'tariff.peakToHour': P,
  'tariff.middayFromHour': P, 'tariff.middayToHour': P,
  'tariff.legacyScaleFactor': `${P} (legacy)`,
  'penalties.overloadRsPerKwSlot': `${P} (1450 Rs/MW inline)`,
  'forecast.z': `${P} (forecast band multiplier)`,
  'forecast.baseBandKw': `${P} (0.35 MW inline)`, 'forecast.horizonGrowth': P,
  'uncertaintyReserve.gain': P, 'uncertaintyReserve.maxExtraSoc': P,
  'loss.formula': 'Spec §21', 'loss.label': 'Spec §21',
};

/** Load archetypes (spec §4). Times are step indices. Override with real fleet data later. */
export const LOAD_ARCHETYPES = {
  e_rickshaw: {
    powerKw: 10, flexibleFraction: 1.0, criticality: 'low',
    earliestStart: 0, latestEnd: 47, deadline: 41, // fully charged by 20:30
    maxShiftSteps: 12,
  },
  water_pump: {
    powerKw: 8, flexibleFraction: 1.0, criticality: 'medium',
    earliestStart: 0, latestEnd: 47, deadline: null, maxShiftSteps: 6,
    tank: { capacityL: 120, minL: 20, initL: 100, litersPerKwh: 10 },
  },
  fan_cooler: {
    powerKw: 2, flexibleFraction: 0.15, criticality: 'high',
    earliestStart: 24, latestEnd: 47, deadline: null, maxShiftSteps: 2,
    comfort: { note: 'at most 15% of load, delay <= 1h' },
  },
  shop_fridge: {
    powerKw: 1.5, flexibleFraction: 0.10, criticality: 'high',
    earliestStart: 0, latestEnd: 47, deadline: null, maxShiftSteps: 1,
  },
  critical: {
    powerKw: 1, flexibleFraction: 0, criticality: 'critical',
    earliestStart: 0, latestEnd: 47, deadline: null, maxShiftSteps: 0,
  },
};

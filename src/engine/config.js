/**
 * GridFlex central configuration (spec §6).
 * Units: kW, kWh, hours, Rs. Time-of-day fields are step indices (0..47, 30-min steps).
 * EVERY leaf under CONFIG must have an entry in PROVENANCE (enforced by tests/config.test.js).
 * Tariffs and costs come from the supplied synthetic data pack; its README labels cost
 * figures approximate/illustrative. Grid emissions uses CEA Version 22.0 FY2025-26.
 */
import ASSUMPTIONS from '../data/assumptions.json' with { type: 'json' };

const P = 'PROTOTYPE ASSUMPTION';
const assumptionValue = (key) => ASSUMPTIONS[key].value;
const sourced = (key) => 'src/data/raw/assumptions_and_tariffs.csv key=' + key + ': ' + ASSUMPTIONS[key].note + '; dataset notes mark values approximate/illustrative and advise verification.';

export const CONFIG = {
  timing: { stepHours: 0.5, stepsPerDay: 48 },
  feeder: { limitKw: assumptionValue('feeder_capacity_mw') * 1000, plannedLoadingFraction: 0.85 },
  battery: {
    enabled: true,
    capacityKwh: assumptionValue('battery_capacity_mwh') * 1000,
    initialSoc: 0.75,
    minReserveSoc: 0.20,
    maxSoc: 0.95,
    maxChargeKw: assumptionValue('battery_max_power_mw') * 1000,
    maxDischargeKw: assumptionValue('battery_max_power_mw') * 1000,
    roundTripEfficiency: assumptionValue('battery_round_trip_efficiency'),
    degradationRsPerKwhThroughput: 0, // set when a vendor cycle-life/price is chosen
    capexRsPerKwh: assumptionValue('battery_capex_rs_per_kwh'),
    cycleLife: assumptionValue('battery_cycle_life'),
  },
  participation: { defaultRate: 0.65 },
  loadRatings: { recoveryHeadroomFactor: 1.5 },
  incentive: { rsPerKwhShifted: assumptionValue('incentive_rs_per_kwh_shifted') },
  capital: { capexDeferralRsPerKwPeak: assumptionValue('capex_deferral_rs_per_kw_peak') },
  emissions: { gridKgCo2PerKwh: assumptionValue('grid_co2_factor_kg_per_kwh_cea_fy2025_26') },
  tariff: {
    peakRsPerKwh: assumptionValue('tariff_peak_rs_per_kwh'), middayRsPerKwh: assumptionValue('tariff_offpeak_rs_per_kwh'), offPeakRsPerKwh: assumptionValue('tariff_normal_rs_per_kwh'),
    peakFromHour: 17, peakToHour: 22, middayFromHour: 10, middayToHour: 15,
    legacyScaleFactor: 0.1, // engine used tariff/10 - decide if intentional
  },
  penalties: { overloadRsPerKwSlot: 1.45 },
  forecast: {
    // Band = max(baseBandKw, z * historical residual sigma), grown over the horizon.
    z: 1.28,
    baseBandKw: 100,
    horizonGrowth: 1.0,
  },
  uncertaintyReserve: {
    // extraReserveSoc = min(maxExtraSoc, gain * (risk-window band / planning limit))
    gain: 0.45,
    maxExtraSoc: 0.20,
  },
  loss: {
    formula: '1 - (newPeak/oldPeak)^2',
    label: 'Directional estimate from the I^2R assumption; not a power-flow calculation.',
  },
};

export const PROVENANCE = {
  'timing.stepHours': P, 'timing.stepsPerDay': P,
  'feeder.limitKw': sourced('feeder_capacity_mw'),
  'feeder.plannedLoadingFraction': `${P} (previously 0.85 inline)`,
  'battery.enabled': P, 'battery.capacityKwh': sourced('battery_capacity_mwh'),
  'battery.initialSoc': P, 'battery.minReserveSoc': P, 'battery.maxSoc': P,
  'battery.maxChargeKw': sourced('battery_max_power_mw'), 'battery.maxDischargeKw': sourced('battery_max_power_mw'),
  'battery.roundTripEfficiency': sourced('battery_round_trip_efficiency'),
  'battery.degradationRsPerKwhThroughput': `${P} (placeholder 0)`,
  'battery.capexRsPerKwh': sourced('battery_capex_rs_per_kwh'), 'battery.cycleLife': sourced('battery_cycle_life'),
  'participation.defaultRate': P,
  'loadRatings.recoveryHeadroomFactor': `${P} (aggregate recovery rating margin)`,
  'incentive.rsPerKwhShifted': sourced('incentive_rs_per_kwh_shifted'),
  'tariff.peakRsPerKwh': sourced('tariff_peak_rs_per_kwh'), 'tariff.middayRsPerKwh': sourced('tariff_offpeak_rs_per_kwh'), 'tariff.offPeakRsPerKwh': sourced('tariff_normal_rs_per_kwh'),
  'tariff.peakFromHour': P, 'tariff.peakToHour': P,
  'tariff.middayFromHour': P, 'tariff.middayToHour': P,
  'tariff.legacyScaleFactor': `${P} (legacy)`,
  'penalties.overloadRsPerKwSlot': `${P} (1450 Rs/MW inline)`,
  'forecast.z': `${P} (forecast band multiplier)`,
  'forecast.baseBandKw': `${P} (reduced from 0.35 MW so historical residuals contribute to the band)`, 'forecast.horizonGrowth': P,
  'uncertaintyReserve.gain': `${P} (tuned to preserve scenario-specific reserve variation)`, 'uncertaintyReserve.maxExtraSoc': P,
  'capital.capexDeferralRsPerKwPeak': sourced('capex_deferral_rs_per_kw_peak'),
  'emissions.gridKgCo2PerKwh': 'CEA CO2 Baseline Database v22.0, Table S, FY2025-26 weighted average (incl. RES and captive): https://cea.nic.in/wp-content/uploads/baseline/2026/09/User_Guide__Version_22.0.pdf',
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

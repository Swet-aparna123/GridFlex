/* PROTOTYPE ASSUMPTION: seasonal-naive means use the most recent matching time slot. */
import { CONFIG } from '../engine/config.js';

const std = (values) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
};

/** Seasonal-naive forecast with a sample-standard-deviation residual band. */
export function forecast({
  historyKw,
  stepsPerDay = CONFIG.timing.stepsPerDay,
  horizon = CONFIG.timing.stepsPerDay,
  z = CONFIG.forecast.z,
}) {
  if (!Array.isArray(historyKw) || historyKw.some((value) => !Number.isFinite(value))) {
    throw new TypeError('forecast: historyKw must be an array of finite numbers');
  }
  if (!Number.isInteger(stepsPerDay) || stepsPerDay < 1) {
    throw new RangeError('forecast: stepsPerDay must be a positive integer');
  }
  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new RangeError('forecast: horizon must be a positive integer');
  }
  if (!Number.isFinite(z) || z < 0) {
    throw new RangeError('forecast: z must be a non-negative finite number');
  }

  const days = Math.floor(historyKw.length / stepsPerDay);
  if (days < 2) throw new Error('forecast: need at least 2 days of history');

  const hist = historyKw.slice(-days * stepsPerDay);
  const day = (index) => hist.slice(index * stepsPerDay, (index + 1) * stepsPerDay);
  const residuals = Array.from({ length: stepsPerDay }, () => []);

  for (let dayIndex = 1; dayIndex < days; dayIndex++) {
    const currentDay = day(dayIndex);
    const previousDay = day(dayIndex - 1);
    for (let slot = 0; slot < stepsPerDay; slot++) {
      residuals[slot].push(currentDay[slot] - previousDay[slot]);
    }
  }

  const globalSigma = std(residuals.flat());
  const sigma = residuals.map((slotResiduals) => (slotResiduals.length >= 3 ? std(slotResiduals) : globalSigma));
  const growth = CONFIG.forecast.horizonGrowth;
  const baseBandKw = CONFIG.forecast.baseBandKw;
  const lastDay = day(days - 1);
  const forecastKw = [];
  const lowerKw = [];
  const upperKw = [];
  const bandKw = [];
  const canClampLowerBound = historyKw.every((value) => value >= 0);

  for (let step = 0; step < horizon; step++) {
    const slot = step % stepsPerDay;
    const mean = lastDay[slot];
    // horizonGrowth is configured as growth over one full day, not per individual step.
    const band = Math.max(baseBandKw, z * sigma[slot]) * (1 + growth * step / stepsPerDay);
    forecastKw.push(+mean.toFixed(3));
    lowerKw.push(+(canClampLowerBound ? Math.max(0, mean - band) : mean - band).toFixed(3));
    upperKw.push(+(mean + band).toFixed(3));
    bandKw.push(+band.toFixed(3));
  }

  return {
    method: 'seasonal-naive',
    stepMinutes: 1440 / stepsPerDay,
    z,
    historyDays: days,
    forecastKw,
    lowerKw,
    upperKw,
    bandKw,
    maxBandKw: Math.max(...bandKw),
    note: 'Seasonal-naive point estimate from the last historical day; band = max(configured floor, z * sample std of day-over-day residuals), grown over the horizon.',
  };
}

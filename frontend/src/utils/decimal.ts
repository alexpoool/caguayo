import Decimal from 'decimal.js';

// Configure for financial precision (default 20 significant digits is fine)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Safe decimal multiplication
 */
export const mul = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return new Decimal(a).mul(b);
};

/**
 * Safe decimal addition
 */
export const add = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return new Decimal(a).add(b);
};

/**
 * Safe decimal subtraction
 */
export const sub = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return new Decimal(a).sub(b);
};

/**
 * Safe decimal division
 */
export const div = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return new Decimal(a).div(b);
};

/**
 * Convert a percentage (e.g. 10 for 10%) to a decimal multiplier
 */
export const percentToMultiplier = (percent: number): Decimal => {
  return new Decimal(percent).div(100);
};

/**
 * Format a Decimal to a fixed number of decimal places string
 */
export const toFixed = (d: Decimal, places: number = 2): string => {
  return d.toFixed(places);
};

/**
 * Convert a Decimal to a number (for API calls that expect number)
 */
export const toNumber = (d: Decimal): number => {
  return d.toNumber();
};

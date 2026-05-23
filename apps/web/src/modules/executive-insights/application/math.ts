/**
 * Pure math utilities shared across executive insight generators.
 * All functions are stateless and side-effect free.
 */

export const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

export const stddev = (xs: number[], m: number): number => {
  if (xs.length === 0) return 0;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
};

export const linregSlope = (xs: number[], ys: number[]): number => {
  if (xs.length < 2) return 0;
  const xm = mean(xs);
  const ym = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xm) * (ys[i] - ym);
    den += (xs[i] - xm) ** 2;
  }
  return den === 0 ? 0 : num / den;
};

export const pct = (n: number) => `${Math.round(Math.abs(n))}%`;
export const signedPct = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}%`;

export const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export const groupBy = <T>(
  arr: T[],
  key: (item: T) => string,
): Record<string, T[]> => {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    out[k] ??= [];
    out[k].push(item);
  }
  return out;
};

/**
 * Compute z-score for the latest point in a series.
 * Returns anomaly info consistent with the intelligence trends engine.
 */
export const summarizeSeries = (
  values: number[],
): { latestZ: number; isAnomaly: boolean } => {
  if (values.length < 3) return { latestZ: 0, isAnomaly: false };
  const window = values.slice(0, -1);
  const latest = values[values.length - 1];
  const wMean = mean(window);
  const wStd = stddev(window, wMean);
  const latestZ = wStd === 0 ? 0 : (latest - wMean) / wStd;
  return { latestZ, isAnomaly: Math.abs(latestZ) >= 2 };
};

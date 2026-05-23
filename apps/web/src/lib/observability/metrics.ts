/**
 * In-process metrics store. Simple atomic counters and gauges that the
 * health endpoint exposes as JSON. For production, pipe these to
 * Prometheus/Datadog via a push exporter.
 */

type Counter = { name: string; value: number; labels: Record<string, string> };
type Gauge = { name: string; value: number; labels: Record<string, string> };
type Histogram = { name: string; sum: number; count: number; labels: Record<string, string> };

const counters = new Map<string, Counter>();
const gauges = new Map<string, Gauge>();
const histograms = new Map<string, Histogram>();

const key = (name: string, labels: Record<string, string>) =>
  `${name}{${Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(",")}}`;

export const inc = (name: string, labels: Record<string, string> = {}, by = 1): void => {
  const k = key(name, labels);
  const existing = counters.get(k);
  if (existing) {
    existing.value += by;
  } else {
    counters.set(k, { name, value: by, labels });
  }
};

export const gauge = (name: string, value: number, labels: Record<string, string> = {}): void => {
  const k = key(name, labels);
  gauges.set(k, { name, value, labels });
};

export const observe = (name: string, value: number, labels: Record<string, string> = {}): void => {
  const k = key(name, labels);
  const existing = histograms.get(k);
  if (existing) {
    existing.sum += value;
    existing.count += 1;
  } else {
    histograms.set(k, { name, sum: value, count: 1, labels });
  }
};

export const snapshot = () => ({
  counters: [...counters.values()],
  gauges: [...gauges.values()],
  histograms: [...histograms.values()].map((h) => ({
    ...h,
    avg: h.count > 0 ? Math.round(h.sum / h.count) : 0,
  })),
});

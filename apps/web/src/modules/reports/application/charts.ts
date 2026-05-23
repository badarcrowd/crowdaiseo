/**
 * Tiny SVG chart helpers — pure, no dependencies.
 *
 * Templates embed inline SVG into report HTML. This avoids shipping a
 * full charting library to the PDF renderer (Playwright) and keeps
 * report layout entirely server-side. The output is good enough for
 * executive-report aesthetics (line, bar, donut).
 */

const W = 640;
const H = 220;
const PAD = 36;

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );

export const lineChart = (input: {
  title?: string;
  points: Array<{ x: string; y: number }>;
  color?: string;
}): string => {
  const { points } = input;
  if (points.length === 0) return emptySvg("No data");
  const color = input.color ?? "#2563EB";
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.y);
  const yMax = Math.max(...ys, 1);
  const yMin = Math.min(...ys, 0);
  const yRange = yMax - yMin || 1;
  const xStep = (W - PAD * 2) / Math.max(1, xs.length - 1);
  const toY = (y: number) => H - PAD - ((y - yMin) / yRange) * (H - PAD * 2);
  const toX = (i: number) => PAD + i * xStep;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.y)}`)
    .join(" ");
  const firstX = esc(points[0]?.x ?? "");
  const lastX = esc(points[points.length - 1]?.x ?? "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"${input.title ? ` aria-label="${esc(input.title)}"` : ""}>
    ${input.title ? `<text x="${PAD}" y="20" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" fill="#0F172A" font-weight="600">${esc(input.title)}</text>` : ""}
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#E2E8F0"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>
    <text x="${PAD}" y="${H - 10}" font-size="10" fill="#64748B">${firstX}</text>
    <text x="${W - PAD}" y="${H - 10}" font-size="10" fill="#64748B" text-anchor="end">${lastX}</text>
    <text x="${PAD - 6}" y="${PAD}" font-size="10" fill="#64748B" text-anchor="end">${Math.round(yMax)}</text>
    <text x="${PAD - 6}" y="${H - PAD}" font-size="10" fill="#64748B" text-anchor="end">${Math.round(yMin)}</text>
  </svg>`;
};

export const barChart = (input: {
  title?: string;
  bars: Array<{ label: string; value: number }>;
  color?: string;
}): string => {
  const { bars } = input;
  if (bars.length === 0) return emptySvg("No data");
  const color = input.color ?? "#2563EB";
  const max = Math.max(...bars.map((b) => b.value), 1);
  const slot = (W - PAD * 2) / bars.length;
  const barWidth = Math.min(slot * 0.6, 40);
  const bs = bars
    .map((b, i) => {
      const h = ((H - PAD * 2) * b.value) / max;
      const x = PAD + i * slot + (slot - barWidth) / 2;
      const y = H - PAD - h;
      return `<g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="3" fill="${color}"/>
        <text x="${x + barWidth / 2}" y="${H - PAD + 14}" font-size="10" fill="#64748B" text-anchor="middle">${esc(b.label)}</text>
        <text x="${x + barWidth / 2}" y="${y - 4}" font-size="10" fill="#0F172A" text-anchor="middle">${Math.round(b.value)}</text>
      </g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"${input.title ? ` aria-label="${esc(input.title)}"` : ""}>
    ${input.title ? `<text x="${PAD}" y="20" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" fill="#0F172A" font-weight="600">${esc(input.title)}</text>` : ""}
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#E2E8F0"/>
    ${bs}
  </svg>`;
};

export const donutChart = (input: {
  title?: string;
  segments: Array<{ label: string; value: number; color?: string }>;
}): string => {
  const total = input.segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return emptySvg("No data");
  const cx = W / 2;
  const cy = H / 2 + 6;
  const r = 70;
  const inner = 40;
  let angle = -Math.PI / 2;
  const palette = ["#2563EB", "#16A34A", "#F59E0B", "#DB2777", "#0EA5E9", "#7C3AED"];
  const paths = input.segments
    .map((s, i) => {
      const portion = s.value / total;
      const next = angle + portion * Math.PI * 2;
      const x0 = cx + Math.cos(angle) * r;
      const y0 = cy + Math.sin(angle) * r;
      const x1 = cx + Math.cos(next) * r;
      const y1 = cy + Math.sin(next) * r;
      const xi0 = cx + Math.cos(next) * inner;
      const yi0 = cy + Math.sin(next) * inner;
      const xi1 = cx + Math.cos(angle) * inner;
      const yi1 = cy + Math.sin(angle) * inner;
      const large = portion > 0.5 ? 1 : 0;
      const color = s.color ?? palette[i % palette.length];
      angle = next;
      return `<path d="M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${xi0},${yi0} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z" fill="${color}"/>`;
    })
    .join("");
  const legend = input.segments
    .map(
      (s, i) =>
        `<g transform="translate(${W - 180}, ${30 + i * 18})">
          <rect width="10" height="10" fill="${s.color ?? palette[i % palette.length]}"/>
          <text x="16" y="9" font-size="11" fill="#0F172A">${esc(s.label)} (${Math.round((s.value / total) * 100)}%)</text>
        </g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"${input.title ? ` aria-label="${esc(input.title)}"` : ""}>
    ${input.title ? `<text x="${PAD}" y="20" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" fill="#0F172A" font-weight="600">${esc(input.title)}</text>` : ""}
    ${paths}
    ${legend}
  </svg>`;
};

const emptySvg = (msg: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F8FAFC"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="13" fill="#94A3B8">${esc(msg)}</text></svg>`;

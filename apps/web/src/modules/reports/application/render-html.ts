import type { ReportBlock, ReportBranding, ReportContent, ReportSection } from "../domain/types";

/**
 * Server-side HTML renderer for a ReportContent + branding.
 *
 * The output is a complete, self-contained HTML document — Playwright
 * navigates to a data URL with this HTML and prints to PDF. No external
 * resources except the optional logo image, which the renderer fetches
 * via the browser at print time.
 *
 * Why hand-rolled HTML instead of React SSR?
 *   - Removes the need for a separate React build path inside the worker.
 *   - PDF print styling is fiddly; controlling the literal markup makes
 *     it easier to debug across Playwright versions.
 */

const esc = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) =>
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

export const renderReportHtml = (
  content: ReportContent,
  branding: ReportBranding,
  options: { aiSummaryMarkdown?: string } = {},
): string => {
  const sectionsHtml = content.sections.map(renderSection).join("\n");
  const notesHtml =
    content.notes && content.notes.length > 0
      ? `<section class="notes"><h3>Notes</h3><ul>${content.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></section>`
      : "";
  const aiHtml = options.aiSummaryMarkdown
    ? `<section class="ai-summary"><h2>Executive summary</h2>${markdownLite(options.aiSummaryMarkdown)}</section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(content.title)}</title>
<style>${baseStyles(branding)}</style>
</head>
<body>
  <header class="cover">
    ${branding.logoUrl ? `<img class="logo" src="${esc(branding.logoUrl)}" alt=""/>` : `<div class="brand-text">${esc(branding.brandName)}</div>`}
    <h1>${esc(content.title)}</h1>
    ${content.subtitle ? `<p class="subtitle">${esc(content.subtitle)}</p>` : ""}
    <p class="range">${esc(content.rangeLabel)}</p>
    <p class="generated">Generated ${esc(content.generatedAt)}</p>
  </header>
  <main>
    ${aiHtml}
    ${sectionsHtml}
    ${notesHtml}
  </main>
  <footer class="page-footer">
    <span>${esc(branding.brandName)}</span>
    ${branding.footerText ? `<span>${esc(branding.footerText)}</span>` : ""}
  </footer>
</body>
</html>`;
};

// ---------------------------------------------------------------------
// Section rendering
// ---------------------------------------------------------------------

const renderSection = (s: ReportSection): string => {
  return `<section class="section">
    <h2>${esc(s.heading)}</h2>
    ${s.lead ? `<p class="lead">${esc(s.lead)}</p>` : ""}
    ${s.blocks.map(renderBlock).join("\n")}
  </section>`;
};

const renderBlock = (b: ReportBlock): string => {
  switch (b.type) {
    case "kpi":
      return `<div class="kpis">${b.items
        .map(
          (k) =>
            `<div class="kpi"><div class="kpi-label">${esc(k.label)}</div><div class="kpi-value">${esc(k.value)}</div>${k.delta ? `<div class="kpi-delta">${esc(k.delta)}</div>` : ""}</div>`,
        )
        .join("")}</div>`;
    case "paragraph":
      return `<p>${esc(b.text)}</p>`;
    case "list": {
      const tag = b.ordered ? "ol" : "ul";
      return `<${tag}>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`;
    }
    case "table":
      return `<table>
        <thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${esc(String(c))}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody>
      </table>`;
    case "chart":
      // SVG is trusted: it's produced by our own chart helper.
      return `<figure class="chart">${b.svg}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`;
    case "callout":
      return `<aside class="callout callout-${b.tone}">${esc(b.text)}</aside>`;
  }
};

/**
 * Tiny markdown subset for AI summaries: paragraphs, bullets, bold.
 * Anything else is escaped as plain text. We deliberately don't enable
 * raw HTML or links here — the AI summary is rendered server-side and
 * we don't want LLM output controlling DOM.
 */
const markdownLite = (md: string): string => {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${formatInline(line.slice(2))}</li>`);
    } else if (line.length === 0) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${formatInline(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
};

const formatInline = (s: string): string => {
  const escaped = esc(s);
  // **bold** → <strong>bold</strong>. Done after escaping, so the
  // asterisks themselves can't be used to inject markup.
  return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
};

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

const baseStyles = (b: ReportBranding): string => `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #0F172A; margin: 0; font-size: 11pt; line-height: 1.5; }
  header.cover { padding: 0 0 40px; border-bottom: 4px solid ${b.primaryColor}; margin-bottom: 32px; page-break-after: always; }
  header.cover .logo { max-height: 56px; margin-bottom: 24px; }
  header.cover .brand-text { font-size: 24px; font-weight: 700; color: ${b.primaryColor}; margin-bottom: 24px; }
  header.cover h1 { font-size: 32pt; margin: 0; color: ${b.primaryColor}; }
  header.cover .subtitle { font-size: 14pt; color: #475569; margin: 8px 0 0; }
  header.cover .range { margin-top: 28px; font-size: 12pt; color: ${b.accentColor}; font-weight: 600; }
  header.cover .generated { margin-top: 6px; color: #64748B; font-size: 10pt; }
  section.section, section.ai-summary, section.notes { margin: 28px 0; page-break-inside: avoid; }
  section.section h2, section.ai-summary h2 { font-size: 18pt; margin: 0 0 6px; color: ${b.primaryColor}; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px; }
  .lead { color: #475569; margin: 0 0 16px; font-size: 11pt; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0 20px; }
  .kpi { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 9pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-value { font-size: 20pt; font-weight: 700; color: ${b.primaryColor}; margin-top: 4px; }
  .kpi-delta { font-size: 10pt; color: ${b.accentColor}; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
  th { background: #F1F5F9; font-weight: 600; }
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 4px; }
  figure.chart { margin: 16px 0; }
  figure.chart svg { width: 100%; height: auto; }
  figcaption { font-size: 9pt; color: #64748B; margin-top: 4px; text-align: center; }
  .callout { border-left: 4px solid ${b.accentColor}; padding: 12px 16px; background: #F8FAFC; margin: 12px 0; border-radius: 4px; }
  .callout-warn { border-color: #F59E0B; background: #FFFBEB; }
  .callout-critical { border-color: #DC2626; background: #FEF2F2; }
  footer.page-footer { position: fixed; bottom: 8mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; font-size: 8pt; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 6px; }
`;

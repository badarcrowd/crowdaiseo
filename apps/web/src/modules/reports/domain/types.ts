import type { ReportTemplate } from "@prisma/client";

// ---------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------

export type ReportParameters = {
  // ISO date strings; undefined = template default (usually 30d).
  rangeStart?: string;
  rangeEnd?: string;
  // For project-scoped templates.
  projectId?: string;
  // Caller-overridable title; templates fall back to a default.
  title?: string;
  // Render with AI executive summary section.
  includeAiSummary?: boolean;
};

// ---------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------

export type ReportBranding = {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  footerText: string | null;
};

export const DEFAULT_BRANDING: ReportBranding = {
  brandName: "AIV",
  logoUrl: null,
  primaryColor: "#0F172A",
  accentColor: "#2563EB",
  footerText: null,
};

// ---------------------------------------------------------------------
// Report content — the rendered output of a template. Stored as JSON
// on the Report row so we can re-render PDFs with different branding
// without re-querying.
// ---------------------------------------------------------------------

export type ReportSection = {
  // Section heading.
  heading: string;
  // Optional one-line lead.
  lead?: string;
  blocks: ReportBlock[];
};

export type ReportBlock =
  | { type: "kpi"; items: Array<{ label: string; value: string; delta?: string }> }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | {
      type: "table";
      columns: string[];
      rows: Array<Array<string | number>>;
    }
  | {
      type: "chart";
      // Inline SVG markup — produced by the chart helper. Pre-rendering
      // means the PDF renderer doesn't need a runtime charting library.
      svg: string;
      caption?: string;
    }
  | { type: "callout"; tone: "info" | "warn" | "critical"; text: string };

export type ReportContent = {
  template: ReportTemplate;
  title: string;
  subtitle?: string;
  // Pre-rendered date range string for the cover.
  rangeLabel: string;
  generatedAt: string; // ISO
  sections: ReportSection[];
  // Footnotes / data caveats.
  notes?: string[];
};

// ---------------------------------------------------------------------
// Template contract — every template implements this. Templates do all
// data loading internally so the orchestrator can treat them uniformly.
// ---------------------------------------------------------------------

export type TemplateContext = {
  workspaceId: string;
  projectId: string | null;
  parameters: ReportParameters;
};

export type ReportTemplateFn = (
  ctx: TemplateContext,
) => Promise<ReportContent>;

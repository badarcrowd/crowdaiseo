import type { ReportTemplate } from "@prisma/client";
import type { ReportTemplateFn } from "../../domain/types";
import { executiveSummaryTemplate } from "./executive";
import { competitorTemplate } from "./competitor";
import { geoTemplate } from "./geo";

/**
 * Template registry — single source of truth for which template
 * function handles each enum value.
 *
 * Adding a template:
 *   1. Add a new value to the `ReportTemplate` enum in schema.prisma.
 *   2. Implement the function in this folder.
 *   3. Register it here.
 *
 * Templates marked `null` are reserved enum values not yet implemented.
 * The generator throws a clear error rather than silently producing an
 * empty report.
 */
export const TEMPLATES: Record<ReportTemplate, ReportTemplateFn | null> = {
  EXECUTIVE_SUMMARY: executiveSummaryTemplate,
  COMPETITOR_ANALYSIS: competitorTemplate,
  GEO_OPTIMIZATION: geoTemplate,
  AI_VISIBILITY_DEEP_DIVE: null,
  CITATION_AUTHORITY: null,
};

export const resolveTemplate = (id: ReportTemplate): ReportTemplateFn => {
  const fn = TEMPLATES[id];
  if (!fn) {
    throw new Error(`Report template not implemented: ${id}`);
  }
  return fn;
};

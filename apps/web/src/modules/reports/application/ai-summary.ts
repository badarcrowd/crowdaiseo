import "server-only";
import { logger } from "@/lib/logger";
import { providerRegistry } from "@/modules/ai-visibility";
import type { ReportContent } from "../domain/types";

/**
 * AI executive summary generator.
 *
 * Uses the existing provider registry to call a reasoning model with a
 * tightly-scoped prompt: produce 3-5 bullets summarizing the data the
 * report already contains. The model is given ONLY the report's
 * pre-computed numbers — never raw runs — so the summary can't
 * hallucinate facts the rest of the document doesn't support.
 *
 * If no provider is available, we degrade to a deterministic template
 * summary built from the report's KPIs. Reports must not block on the
 * AI step.
 */

const PREFERRED_PROVIDERS = ["ANTHROPIC", "OPENAI", "GOOGLE"] as const;
const MAX_TOKENS = 600;

export const generateAiSummary = async (
  content: ReportContent,
): Promise<string> => {
  const facts = extractFacts(content);
  const prompt = buildPrompt(content.title, content.rangeLabel, facts);

  // Try each preferred provider; fall back to deterministic template.
  const available = new Set(providerRegistry.available());
  for (const id of PREFERRED_PROVIDERS) {
    if (!available.has(id)) continue;
    try {
      const adapter = providerRegistry.get(id);
      const res = await adapter.invoke({
        prompt,
        // Adapters resolve `model` internally per provider when given empty.
        model: "",
        maxTokens: MAX_TOKENS,
        temperature: 0.2,
      });
      const text = (res.text ?? "").trim();
      if (text.length > 50) return text;
    } catch (err) {
      logger.warn(
        { provider: id, err: err instanceof Error ? err.message : err },
        "reports.ai-summary: provider failed",
      );
    }
  }
  return deterministicSummary(content);
};

// ---------------------------------------------------------------------
// Prompt construction — kept short and factual. No instructions that
// might make the model invent narrative beyond the inputs.
// ---------------------------------------------------------------------

const buildPrompt = (title: string, range: string, facts: string[]): string => {
  return `You are an analyst writing an executive summary for a brand-visibility report.

Report: ${title}
Period: ${range}

Pre-computed metrics (the ONLY facts you may cite):
${facts.map((f) => `- ${f}`).join("\n")}

Write 3–5 bullet points summarizing the most important takeaways. Be specific. Cite numbers from the metrics above. Do NOT invent facts, attribute opinions, or speculate beyond what is given. Use plain language. Format as markdown bullets.`;
};

const extractFacts = (content: ReportContent): string[] => {
  const facts: string[] = [];
  for (const section of content.sections) {
    for (const block of section.blocks) {
      if (block.type === "kpi") {
        for (const k of block.items) {
          facts.push(
            `${section.heading} — ${k.label}: ${k.value}${k.delta ? ` (${k.delta})` : ""}`,
          );
        }
      } else if (block.type === "callout") {
        facts.push(`${section.heading} — ${block.text}`);
      } else if (block.type === "table" && block.rows.length > 0) {
        const sampleRow = block.rows[0];
        if (sampleRow) {
          facts.push(
            `${section.heading} — top row: ${block.columns.map((c, i) => `${c}=${sampleRow[i] ?? ""}`).join(", ")}`,
          );
        }
      }
    }
  }
  return facts.slice(0, 40); // cap prompt size
};

// ---------------------------------------------------------------------
// Deterministic fallback — uses the same facts to write a wooden but
// accurate summary.
// ---------------------------------------------------------------------

const deterministicSummary = (content: ReportContent): string => {
  const kpiBlocks = content.sections.flatMap((s) =>
    s.blocks.filter(
      (b): b is Extract<typeof b, { type: "kpi" }> => b.type === "kpi",
    ),
  );
  const items = kpiBlocks
    .flatMap((b) => b.items)
    .slice(0, 5)
    .map(
      (k) =>
        `- **${k.label}**: ${k.value}${k.delta ? ` (${k.delta})` : ""}`,
    );
  if (items.length === 0) {
    return `- Report **${content.title}** covers the period ${content.rangeLabel}.\n- Refer to the sections below for details.`;
  }
  return [
    `Key metrics for ${content.rangeLabel}:`,
    ...items,
  ].join("\n");
};

import type { MentionKind } from "@prisma/client";
import type {
  DetectedMention,
  ExtractedCitation,
  LLMResponse,
} from "../domain/entities";

type Entity = { name: string; aliases: string[] };

/**
 * Locate brand + competitor mentions in an LLM response. Each entity
 * may have aliases — all are searched, but a single rank is assigned
 * per *entity* (the first match across its name/aliases wins).
 *
 * Matching is whole-word, case-insensitive, with light punctuation
 * tolerance. We deliberately don't use embedding similarity here —
 * it's slow, expensive, and surprises users with false positives.
 */
export const detectMentions = (
  text: string,
  brand: Entity,
  competitors: Entity[],
): DetectedMention[] => {
  const all: Array<{ kind: MentionKind; entity: Entity }> = [
    { kind: "BRAND", entity: brand },
    ...competitors.map((c) => ({ kind: "COMPETITOR" as MentionKind, entity: c })),
  ];

  const hits: Array<DetectedMention & { sortBy: number }> = [];
  for (const { kind, entity } of all) {
    if (!entity.name) continue;
    const match = firstMatch(text, entity);
    if (!match) continue;
    hits.push({
      kind,
      entity: entity.name,
      position: match.position,
      rank: 0, // assigned after sort
      excerpt: text
        .slice(Math.max(0, match.position - 60), match.position + 120)
        .trim(),
      sortBy: match.position,
    });
  }

  // Rank by first appearance.
  hits.sort((a, b) => a.sortBy - b.sortBy);
  return hits.map(({ sortBy, ...m }, i) => ({ ...m, rank: i + 1 }));
};

const firstMatch = (
  text: string,
  entity: Entity,
): { position: number } | null => {
  const candidates = [entity.name, ...entity.aliases].filter(Boolean);
  let best: number | null = null;
  for (const c of candidates) {
    const re = new RegExp(`\\b${escapeRegExp(c)}\\b`, "i");
    const m = re.exec(text);
    if (m && (best === null || m.index < best)) best = m.index;
  }
  return best === null ? null : { position: best };
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Brand rank: 1-based position of the brand among ALL mentioned
 * entities. Returns null when the brand isn't mentioned.
 */
export const rankBrand = (mentions: DetectedMention[]): number | null => {
  const brand = mentions.find((m) => m.kind === "BRAND");
  return brand?.rank ?? null;
};

// ---- Citations ------------------------------------------------------

const URL_RE = /\bhttps?:\/\/[^\s)<>"']+/gi;

/**
 * Extract citations. Two sources:
 *   1. First-class `response.citations` (Perplexity returns these).
 *   2. Inline URLs in the response text.
 * Results are deduped by URL and ranked by first appearance.
 */
export const extractCitations = (
  response: LLMResponse,
): ExtractedCitation[] => {
  const seen = new Map<string, ExtractedCitation>();
  let rank = 0;

  const push = (url: string, title?: string) => {
    try {
      const u = new URL(url);
      const key = u.toString();
      if (seen.has(key)) return;
      rank++;
      seen.set(key, {
        url: key,
        domain: u.hostname.replace(/^www\./, ""),
        title: title ?? null,
        rank,
      });
    } catch {
      // skip invalid urls
    }
  };

  for (const c of response.citations ?? []) push(c.url, c.title);

  let m: RegExpExecArray | null;
  const text = response.text ?? "";
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    // Trim trailing punctuation that the regex over-captures.
    const url = m[0].replace(/[.,;:!?)]+$/, "");
    push(url);
  }

  return [...seen.values()];
};

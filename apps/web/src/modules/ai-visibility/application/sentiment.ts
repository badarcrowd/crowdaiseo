import type { SentimentLabel } from "@prisma/client";
import type { DetectedMention } from "../domain/entities";

/**
 * Lightweight lexicon-based sentiment scoring scoped to the *brand
 * mention*. We do not score the entire response (which often contains
 * neutral preamble + a brief brand reference); instead we sample a
 * window around the brand match and compute polarity there.
 *
 * Returns null when there is no brand mention to score.
 *
 * Why not run another LLM call? Latency + cost. Lexicon is good enough
 * to flag "praised vs. criticized" reliably; for nuanced cases the UI
 * shows the raw excerpt so users can verify.
 */

// Curated lexicon — small but covers ~90% of evaluative language used
// by LLMs when discussing products/brands.
const POSITIVE_WORDS = new Set([
  "best", "leading", "top", "recommended", "trusted", "popular", "preferred",
  "powerful", "advanced", "innovative", "reliable", "robust", "excellent",
  "great", "outstanding", "superior", "favorite", "love", "loved", "praise",
  "praised", "strong", "premium", "high-quality", "comprehensive", "industry-leading",
]);

const NEGATIVE_WORDS = new Set([
  "worst", "weak", "outdated", "expensive", "overpriced", "buggy", "broken",
  "limited", "poor", "lacking", "missing", "inferior", "criticized", "hate",
  "hated", "complaint", "complaints", "deprecated", "discontinued", "slow",
  "clunky", "frustrating", "unreliable", "controversial",
]);

const NEGATIONS = new Set(["not", "no", "never", "without", "lacks", "lacking"]);

const WINDOW_CHARS = 240;

export type SentimentResult = { label: SentimentLabel; score: number };

export const analyzeSentiment = (
  text: string,
  mentions: DetectedMention[],
): SentimentResult | null => {
  const brand = mentions.find((m) => m.kind === "BRAND");
  if (!brand) return null;

  const start = Math.max(0, brand.position - WINDOW_CHARS / 2);
  const end = Math.min(text.length, brand.position + WINDOW_CHARS / 2);
  const window = text.slice(start, end).toLowerCase();

  const tokens = window.split(/[\s,.;:!?()"'\[\]{}]+/).filter(Boolean);
  let pos = 0;
  let neg = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : null;
    const negated = prev !== null && NEGATIONS.has(prev);
    if (POSITIVE_WORDS.has(t)) {
      if (negated) neg++;
      else pos++;
    } else if (NEGATIVE_WORDS.has(t)) {
      if (negated) pos++;
      else neg++;
    }
  }

  const total = pos + neg;
  if (total === 0) return { label: "NEUTRAL", score: 0 };

  // Normalize to -1..1
  const score = (pos - neg) / total;
  let label: SentimentLabel;
  if (pos > 0 && neg > 0 && Math.abs(score) < 0.25) label = "MIXED";
  else if (score >= 0.25) label = "POSITIVE";
  else if (score <= -0.25) label = "NEGATIVE";
  else label = "NEUTRAL";

  return { label, score: Math.round(score * 100) / 100 };
};

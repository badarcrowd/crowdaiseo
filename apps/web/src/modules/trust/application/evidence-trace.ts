import type { PromptCategory, ProviderId } from "@prisma/client";
import type {
  CitationContribution,
  EvidenceTrace,
  PromptContribution,
  ProviderContribution,
  SnapshotReference,
} from "../domain/types";

// -------------------------------------------------------------------------
// Input shapes (normalized from DB data)
// -------------------------------------------------------------------------

export type RawRunForTrace = {
  promptId: string;
  category: PromptCategory;
  provider: ProviderId;
  brandMentioned: boolean;
  brandRank: number | null;
  citationCount: number;
  citationDomains: string[];
};

export type RawCitationForTrace = {
  domain: string;
  count: number;
  authorityScore: number;
  byProvider: Partial<Record<ProviderId, number>>;
};

export type RawSnapshotForTrace = {
  day: string;
  score: number;
};

export type EvidenceTraceInput = {
  sourceType: EvidenceTrace["sourceType"];
  sourceId?: string;
  runs: RawRunForTrace[];
  citations: RawCitationForTrace[];
  snapshots: RawSnapshotForTrace[];
  /** Days of history this trace covers. */
  windowDays: number;
  /**
   * Earliest snapshot day — everything on or before this date is a "baseline"
   * reference, everything after is "current period" data.
   */
  baselineCutoffDay?: string;
};

/**
 * Evidence Trace Builder.
 *
 * Given raw DB records, produces a structured `EvidenceTrace` that lets
 * users inspect exactly which data influenced a score, insight, or recommendation.
 *
 * Weights:
 *   - Prompt contribution weight = 1 / totalRuns (equal weight per run).
 *   - Provider weight = providerRunCount / totalRuns.
 *   - Citation ordering by count desc.
 *   - Snapshots marked as baseline if <= baselineCutoffDay.
 */
export const buildEvidenceTrace = (input: EvidenceTraceInput): EvidenceTrace => {
  const { sourceType, sourceId, runs, citations, snapshots, windowDays, baselineCutoffDay } = input;

  const totalRuns = runs.length;
  const unitWeight = totalRuns > 0 ? 1 / totalRuns : 0;

  const contributingPrompts: PromptContribution[] = runs.map((r) => ({
    promptId: r.promptId,
    category: r.category,
    provider: r.provider,
    weight: round3(unitWeight),
    brandMentioned: r.brandMentioned,
    brandRank: r.brandRank,
    citationCount: r.citationCount,
  }));

  const citationMap = new Map<string, { count: number; authority: number; providers: Set<ProviderId> }>();
  for (const c of citations) {
    const entry = citationMap.get(c.domain) ?? { count: 0, authority: c.authorityScore, providers: new Set() };
    entry.count += c.count;
    for (const [p, n] of Object.entries(c.byProvider) as [ProviderId, number][]) {
      if (n > 0) entry.providers.add(p);
    }
    citationMap.set(c.domain, entry);
  }

  const contributingCitations: CitationContribution[] = Array.from(citationMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 20)
    .map(([domain, { count, authority, providers }]) => ({
      domain,
      count,
      authorityScore: authority,
      providers: Array.from(providers),
    }));

  const providerRunCounts = new Map<ProviderId, number>();
  for (const r of runs) {
    providerRunCounts.set(r.provider, (providerRunCounts.get(r.provider) ?? 0) + 1);
  }

  const providerMentionCounts = new Map<ProviderId, number>();
  for (const r of runs) {
    if (r.brandMentioned) {
      providerMentionCounts.set(r.provider, (providerMentionCounts.get(r.provider) ?? 0) + 1);
    }
  }

  const contributingProviders: ProviderContribution[] = Array.from(providerRunCounts.entries())
    .map(([provider, count]) => ({
      provider,
      runsAnalyzed: count,
      mentionRate: round3(count > 0 ? (providerMentionCounts.get(provider) ?? 0) / count : 0),
      weight: round3(totalRuns > 0 ? count / totalRuns : 0),
    }))
    .sort((a, b) => b.runsAnalyzed - a.runsAnalyzed);

  const historicalSnapshots: SnapshotReference[] = snapshots.map((s) => ({
    day: s.day,
    score: s.score,
    usedAsBaseline: baselineCutoffDay ? s.day <= baselineCutoffDay : false,
  }));

  return {
    sourceType,
    sourceId,
    contributingPrompts,
    contributingCitations,
    contributingProviders,
    historicalSnapshots,
    totalRunsAnalyzed: totalRuns,
    windowDays,
  };
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const round3 = (n: number) => Math.round(n * 1000) / 1000;

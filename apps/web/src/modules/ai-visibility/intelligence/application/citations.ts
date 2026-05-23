import type { ProviderId } from "@prisma/client";
import { domainAuthority } from "../domain/authority";
import type {
  CitationAggregate,
  CitationIntelligence,
  CitationOpportunity,
  IntelligenceRunSample,
} from "../domain/types";

/**
 * Citation Intelligence.
 *
 * Aggregates citation domains across runs and identifies:
 *   - which sources AI providers consistently lean on
 *   - per-provider citation diversity (concentrated vs. wide reading list)
 *   - opportunity domains the brand should be present on
 *
 * "Opportunity" means: a domain that appeared frequently across runs
 * AND has reasonable authority AND the brand was not present in the
 * citation set. These are the surfaces where being mentioned would
 * shift future AI answers.
 */

const OPPORTUNITY_MIN_FREQ = 0.1; // appeared in >=10% of runs
const OPPORTUNITY_MIN_AUTHORITY = 0.5;

export const analyzeCitations = (
  samples: IntelligenceRunSample[],
  brandDomain: string | null,
): CitationIntelligence => {
  const totalRuns = samples.length;
  if (totalRuns === 0) {
    return { aggregates: [], opportunities: [], providerDiversity: [] };
  }

  type AggBuilder = {
    domain: string;
    count: number;
    appearedInRuns: number;
    ranks: number[];
    byProvider: Record<string, number>;
  };
  const builders = new Map<string, AggBuilder>();
  // Per-provider citation totals & unique domains, for diversity.
  const providerStats = new Map<
    string,
    { citations: number; unique: Set<string> }
  >();

  for (const run of samples) {
    const ps = providerStats.get(run.provider) ?? {
      citations: 0,
      unique: new Set<string>(),
    };
    const seenInRun = new Set<string>();
    for (const c of run.citationDomains) {
      const key = c.domain.toLowerCase();
      let b = builders.get(key);
      if (!b) {
        b = {
          domain: c.domain,
          count: 0,
          appearedInRuns: 0,
          ranks: [],
          byProvider: {},
        };
        builders.set(key, b);
      }
      b.count++;
      b.ranks.push(c.rank);
      b.byProvider[run.provider] = (b.byProvider[run.provider] ?? 0) + 1;
      if (!seenInRun.has(key)) {
        b.appearedInRuns++;
        seenInRun.add(key);
      }
      ps.citations++;
      ps.unique.add(key);
    }
    providerStats.set(run.provider, ps);
  }

  const aggregates: CitationAggregate[] = [...builders.values()]
    .map((b) => ({
      domain: b.domain,
      count: b.count,
      appearedInRuns: b.appearedInRuns,
      totalRuns,
      authorityScore: domainAuthority(b.domain),
      byProvider: b.byProvider as Record<ProviderId, number>,
      avgRank: b.ranks.length > 0 ? round1(mean(b.ranks)) : null,
    }))
    .sort((a, b) => b.count - a.count);

  // ---- Provider diversity ----
  const providerDiversity = [...providerStats.entries()]
    .map(([provider, s]) => ({
      provider: provider as ProviderId,
      diversity: s.citations > 0 ? s.unique.size / s.citations : 0,
      citations: s.citations,
    }))
    .sort((a, b) => b.diversity - a.diversity);

  // ---- Opportunities ----
  const brandDomainLc = brandDomain?.toLowerCase() ?? null;
  const opportunities: CitationOpportunity[] = aggregates
    .filter((a) => {
      const freq = a.appearedInRuns / totalRuns;
      const isBrand =
        brandDomainLc !== null &&
        (a.domain.toLowerCase() === brandDomainLc ||
          a.domain.toLowerCase().endsWith(`.${brandDomainLc}`));
      return (
        !isBrand &&
        freq >= OPPORTUNITY_MIN_FREQ &&
        a.authorityScore >= OPPORTUNITY_MIN_AUTHORITY
      );
    })
    .slice(0, 15)
    .map<CitationOpportunity>((a) => {
      const freq = a.appearedInRuns / totalRuns;
      // Score blends frequency × authority — both matter, and a domain
      // weak in one but strong in the other shouldn't dominate.
      const score = clamp(freq * 0.6 + a.authorityScore * 0.4, 0, 1);
      return {
        domain: a.domain,
        reason:
          a.authorityScore >= 0.8
            ? "high-authority-no-brand-link"
            : "frequently-cited-competitor-source",
        score: round2(score),
        detail: `Cited in ${Math.round(freq * 100)}% of runs (authority ${a.authorityScore.toFixed(2)}).`,
      };
    });

  return { aggregates, opportunities, providerDiversity };
};

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

import type { ProviderId, PromptCategory } from "@prisma/client";

export type DomainType =
  | "Community"
  | "Authority"
  | "Documentation"
  | "Blog"
  | "News"
  | "Web";

export type ProviderScores = {
  citationDensity: number;       // How frequently it cites sources (0-100)
  authorityPreference: number;   // Preference for high-authority / .edu / .gov domains (0-100)
  communityReliance: number;     // Reddit / forum reliance (0-100)
  documentationAffinity: number; // Docs / developer reference preference (0-100)
  categoryConsistency: number;   // Evenness of mention rate across prompt categories (0-100)
  sentimentPositivity: number;   // Normalized sentiment (0-100, 50 = neutral)
  rankStability: number;         // Inverse of volatility (0-100, 100 = perfectly stable)
  mentionReliability: number;    // Overall brand mention rate (0-100)
};

export type ProviderRaw = {
  mentionRate: number;        // 0-1
  avgBrandRank: number | null;
  avgSentiment: number;       // -1 to 1
  citationRate: number;       // 0-1
  avgDomainAuthority: number; // 0-100
  volatility: number;         // 0-100
  totalRuns: number;
};

export type TopDomain = {
  domain: string;
  count: number;
  authority: number;
  type: DomainType;
};

export type ProviderProfile = {
  provider: ProviderId;
  displayName: string;
  color: string;
  scores: ProviderScores;
  raw: ProviderRaw;
  categoryStrengths: Partial<Record<PromptCategory, number>>;
  citationsByDomainType: Partial<Record<DomainType, number>>;
  topDomains: TopDomain[];
  characterization: string;
};

export type MarketMapData = {
  providers: ProviderProfile[];
  crossProviderInsights: string[];
  computedAt: string;
  dataWindow: number;
  totalRunsAnalyzed: number;
};

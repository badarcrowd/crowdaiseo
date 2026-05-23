/**
 * Public surface of the ai-visibility module. Server actions and other
 * modules should import only from here.
 */
export {
  startVisibilityScan,
  cancelVisibilityScan,
  type StartScanInput,
} from "./application/start-scan";

export {
  createPrompt,
  revisePrompt,
  archivePrompt,
  type CreatePromptInput,
} from "./application/manage-prompts";

// Domain types commonly needed by callers (UI, server actions, API).
export type {
  LLMRequest,
  LLMResponse,
  LLMCitation,
  RunOutcome,
  RunAnalysis,
  DetectedMention,
  ExtractedCitation,
  VisibilityScore,
  ScanSummary,
} from "./domain/entities";

export { MODELS, ALL_PROVIDERS, type ProviderModel } from "./domain/providers";

// Read-side adapters — UI / dashboards consume these.
export { scanRepository } from "./infrastructure/scan.repository";
export { promptStore } from "./infrastructure/prompt.store";
export { providerRegistry } from "./infrastructure/providers/registry";

// Visibility Intelligence Engine — derived scoring, competitor /
// citation analysis, trends, and deterministic insights.
export {
  intelligenceQueries,
  intelligenceRepository,
  runIntelligencePipeline,
  analyzeCompetitors,
  analyzeCitations,
  summarizeTrend,
  computeIntelligenceScore,
} from "./intelligence";
export type {
  IntelligenceScore,
  IntelligenceRunSample,
  ScoringOptions,
  ScoringWeights,
  CompetitorIntelligence,
  CitationIntelligence,
  TrendSummary,
  GeneratedInsight,
} from "./intelligence";

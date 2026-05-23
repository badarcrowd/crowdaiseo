/**
 * GEO — Generative Engine Optimization recommendation engine.
 *
 * Public surface. Internal generators / context loaders stay private.
 */

// Pipeline + read-side
export { runGeoPipeline } from "./application/pipeline";
export { geoQueries } from "./application/queries";
export { recommendationRepository } from "./infrastructure/recommendation.repository";

// Pure generators + prioritization (exported for tests / ad-hoc tooling)
export { prioritize } from "./application/prioritize";
export {
  allGenerators,
  contentGenerators,
  technicalGenerators,
  authorityGenerators,
  aiOptimizationGenerators,
} from "./application/generators";

// Types
export type {
  GeneratedRecommendation,
  PrioritizedRecommendation,
  RecommendationContext,
  RecommendationGenerator,
} from "./domain/types";
export { DIFFICULTY_COST } from "./domain/types";
export type { RecommendationListItem } from "./application/queries";

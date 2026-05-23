import "server-only";
import type {
  AnomalyReport,
  ConfidenceScore,
  EvidenceTrace,
  Explanation,
  FreshnessStatus,
  TrustEnvelope,
} from "../domain/types";
import { computeConfidence } from "./confidence";
import { assessFreshness } from "./freshness";
import { detectAnomalies } from "./anomaly";
import { buildEvidenceTrace } from "./evidence-trace";
import { explainScoreChange } from "./explainability";
import {
  buildFreshnessInput,
  loadAnomalyInput,
  loadEvidenceTraceInput,
  loadScoreChangeSummary,
  loadTrustContext,
} from "./queries";

export type ProjectTrustBundle = {
  confidence: ConfidenceScore;
  freshness: FreshnessStatus;
  anomalies: AnomalyReport;
  explanation: Explanation | null;
  trace: EvidenceTrace;
};

/**
 * Full Trust Bundle for a project.
 *
 * Runs the complete trust pipeline in parallel where possible:
 *   1. Load trust context (lightweight aggregation)
 *   2. Assess freshness
 *   3. Detect anomalies (loads time series)
 *   4. Build evidence trace (loads run/citation/snapshot data)
 *   5. Generate score change explanation
 *   6. Compute confidence (depends on freshness + anomalies)
 *
 * Returns a single `ProjectTrustBundle` suitable for attaching to any
 * scored artifact on the project dashboard.
 */
export const buildProjectTrustBundle = async (input: {
  projectId: string;
  workspaceId: string;
  scanId?: string;
  windowDays?: number;
}): Promise<ProjectTrustBundle> => {
  const { projectId, workspaceId, scanId, windowDays = 30 } = input;

  // Phase 1: parallel data loads
  const [trustCtx, anomalyInput, traceInput, scoreChange] = await Promise.all([
    loadTrustContext({ projectId, workspaceId }),
    loadAnomalyInput({ projectId }),
    loadEvidenceTraceInput({ projectId, scanId, windowDays }),
    loadScoreChangeSummary({ projectId, windowDays: 14 }),
  ]);

  // Phase 2: deterministic computations (all pure, no DB)
  const freshness = assessFreshness(buildFreshnessInput(trustCtx));
  const anomalies = detectAnomalies(anomalyInput);
  const trace = buildEvidenceTrace(traceInput);

  // Compute mean volatility from provider score series
  const providerVolatilities = anomalyInput.providerScores.map(({ series }) => {
    if (series.length < 2) return 0;
    const values = series.map((p) => p.score);
    const m = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, x) => s + (x - m) ** 2, 0) / values.length);
    return Math.min(std / 50, 1);
  });
  const meanVolatility =
    providerVolatilities.length > 0
      ? providerVolatilities.reduce((a, b) => a + b, 0) / providerVolatilities.length
      : 0;

  const confidence = computeConfidence({
    evidenceCount: trustCtx.totalRunsLast30d,
    freshness,
    meanVolatility,
    anomalies,
  });

  const explanation =
    scoreChange !== null ? explainScoreChange(scoreChange) : null;

  return {
    confidence,
    freshness,
    anomalies,
    explanation,
    trace,
  };
};

/**
 * Wraps any data value in a TrustEnvelope using a pre-built bundle.
 */
export const wrapWithTrust = <T>(
  data: T,
  bundle: ProjectTrustBundle,
  explanation?: Explanation,
): TrustEnvelope<T> => ({
  data,
  confidence: bundle.confidence,
  freshness: bundle.freshness,
  anomalies: bundle.anomalies,
  explanation: explanation ?? bundle.explanation ?? undefined,
  trace: bundle.trace,
});

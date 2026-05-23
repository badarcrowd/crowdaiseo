import type {
  MentionKind,
  ProviderId,
  RunStatus,
  ScanStatus,
  SentimentLabel,
} from "@prisma/client";

export type PromptInput = {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  intent: string | null;
  version: number;
  content: string;
  variables: Array<{ name: string; required?: boolean }>;
};

export type RenderedPrompt = {
  promptId: string;
  promptVersion: number;
  content: string; // post-interpolation
  contentHash: string; // sha256 of content + provider id
};

export type LLMRequest = {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
};

export type LLMCitation = { url: string; title?: string };

export type LLMResponse = {
  text: string;
  raw: unknown;          // provider-specific payload (stored for debugging)
  citations?: LLMCitation[]; // first-class citations when supported
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  finishReason?: string;
};

export type RunOutcome = {
  provider: ProviderId;
  model: string;
  status: RunStatus;
  response: LLMResponse | null;
  latencyMs: number;
  cached: boolean;
  costUsd?: number;
  error?: string;
};

export type DetectedMention = {
  kind: MentionKind;
  entity: string;
  position: number; // char offset in response text
  rank: number;     // 1-based, by first appearance
  excerpt: string;
};

export type ExtractedCitation = {
  url: string;
  domain: string;
  title: string | null;
  rank: number;
};

export type RunAnalysis = {
  brandMentioned: boolean;
  brandRank: number | null;
  mentions: DetectedMention[];
  citations: ExtractedCitation[];
  sentiment: { label: SentimentLabel; score: number } | null;
};

export type VisibilityScore = {
  total: number; // 0-100
  byProvider: Record<ProviderId, number>;
  breakdown: {
    citationRate: number;     // % of runs where brand was cited at all
    avgRank: number | null;   // mean rank where mentioned
    sentimentBonus: number;   // +/- delta from baseline
    citationCount: number;
  };
};

export type ScanSummary = {
  id: string;
  status: ScanStatus;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  score: VisibilityScore | null;
};

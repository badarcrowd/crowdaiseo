-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'PAUSED');

-- CreateEnum
CREATE TYPE "UsageEvent" AS ENUM ('SCAN_COMPLETED', 'PROMPT_RUN_COMPLETED', 'REPORT_GENERATED', 'REPORT_EXPORTED', 'CRAWL_COMPLETED', 'API_CALL', 'AI_TOKEN_CONSUMED', 'INSIGHT_SHARED', 'TEAM_MEMBER_INVITED');

-- CreateEnum
CREATE TYPE "PromptCategory" AS ENUM ('COMMERCIAL', 'INFORMATIONAL', 'LOCAL_SEO', 'BRAND', 'COMPARISON', 'TRANSACTIONAL');

-- CreateEnum
CREATE TYPE "InsightKind" AS ENUM ('SCORE_DELTA_POSITIVE', 'SCORE_DELTA_NEGATIVE', 'PROVIDER_DELTA_POSITIVE', 'PROVIDER_DELTA_NEGATIVE', 'COMPETITOR_DOMINANCE', 'COMPETITOR_GAP', 'COMPETITOR_NEW_ENTRANT', 'CITATION_OPPORTUNITY', 'CITATION_AUTHORITY_GAP', 'CATEGORY_WEAK_SPOT', 'PROVIDER_VOLATILITY', 'ANOMALY_DETECTED', 'RANK_IMPROVED', 'RANK_DECLINED', 'SENTIMENT_SHIFT', 'EXECUTIVE_WEEKLY_SUMMARY', 'COMPETITIVE_THREAT', 'AI_PERCEPTION_POSITIVE', 'AI_PERCEPTION_NEGATIVE', 'BRAND_TRUST_SIGNAL', 'PROVIDER_RECOMMENDATION', 'GROWTH_OPPORTUNITY', 'STRATEGIC_ALERT');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'ATTENTION', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('CONTENT', 'TECHNICAL', 'AUTHORITY', 'AI_OPTIMIZATION');

-- CreateEnum
CREATE TYPE "RecommendationKind" AS ENUM ('CONTENT_TOPIC_CLUSTER_GAP', 'CONTENT_FAQ_OPPORTUNITY', 'CONTENT_SEMANTIC_GAP', 'CONTENT_COMPARISON_PAGE', 'CONTENT_AUTHORITY_PILLAR', 'TECH_MISSING_SCHEMA', 'TECH_METADATA_GAP', 'TECH_CRAWLABILITY_ISSUE', 'TECH_PAGE_STRUCTURE_ISSUE', 'TECH_PERFORMANCE_ISSUE', 'AUTHORITY_CITATION_OPPORTUNITY', 'AUTHORITY_BACKLINK_OPPORTUNITY', 'AUTHORITY_PR_OPPORTUNITY', 'AUTHORITY_COMMUNITY_VISIBILITY', 'AI_PROMPT_ALIGNMENT', 'AI_ENTITY_STRENGTHENING', 'AI_TRUST_SIGNAL', 'AI_EEAT_IMPROVEMENT');

-- CreateEnum
CREATE TYPE "RecommendationDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'STALE');

-- CreateEnum
CREATE TYPE "ReportTemplate" AS ENUM ('EXECUTIVE_SUMMARY', 'COMPETITOR_ANALYSIS', 'GEO_OPTIMIZATION', 'AI_VISIBILITY_DEEP_DIVE', 'CITATION_AUTHORITY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'RENDERING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportDeliveryChannel" AS ENUM ('EMAIL', 'WEBHOOK', 'IN_APP');

-- CreateEnum
CREATE TYPE "ReportDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED');

-- AlterEnum
ALTER TYPE "PlanTier" ADD VALUE 'AGENCY';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "country" TEXT,
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "language" TEXT;

-- AlterTable
ALTER TABLE "prompts" ADD COLUMN     "category" "PromptCategory" NOT NULL DEFAULT 'INFORMATIONAL',
ADD COLUMN     "preferredProviders" "ProviderId"[] DEFAULT ARRAY[]::"ProviderId"[];

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
ADD COLUMN     "trialActivatedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "scoring_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "weightCitationRate" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "weightRankBonus" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "weightSentimentBonus" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "weightCitationDensity" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "providerWeights" JSONB,
    "minRunsForConfidence" INTEGER NOT NULL DEFAULT 20,
    "sentimentAdjusted" BOOLEAN NOT NULL DEFAULT true,
    "authorityWeighted" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visibility_score_snapshots" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "scanId" TEXT,
    "total" INTEGER NOT NULL,
    "byProvider" JSONB NOT NULL,
    "citationRate" DOUBLE PRECISION NOT NULL,
    "avgRank" DOUBLE PRECISION,
    "sentimentBonus" DOUBLE PRECISION NOT NULL,
    "citationCount" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "weightsUsed" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visibility_score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_daily_metrics" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "entity" TEXT NOT NULL,
    "competitorId" TEXT,
    "mentions" INTEGER NOT NULL DEFAULT 0,
    "appearedInRuns" INTEGER NOT NULL DEFAULT 0,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "avgRank" DOUBLE PRECISION,
    "byProvider" JSONB NOT NULL,
    "byCategory" JSONB NOT NULL,
    "shareOfVoice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation_daily_metrics" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "domain" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "appearedInRuns" INTEGER NOT NULL DEFAULT 0,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "authorityScore" DOUBLE PRECISION NOT NULL,
    "byProvider" JSONB NOT NULL,
    "avgRank" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_volatility_metrics" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "provider" "ProviderId" NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "rankStability" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_volatility_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_records" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "InsightKind" NOT NULL,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "forDay" DATE NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "kind" "RecommendationKind" NOT NULL,
    "targetKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "difficulty" "RecommendationDifficulty" NOT NULL,
    "priorityScore" DOUBLE PRECISION NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "evidence" JSONB,
    "metadata" JSONB,
    "generatedFor" DATE NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "template" "ReportTemplate" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
    "parameters" JSONB NOT NULL,
    "payload" JSONB,
    "aiSummary" TEXT,
    "storagePath" TEXT,
    "pdfBytes" INTEGER,
    "brandingSnapshot" JSONB,
    "scheduleId" TEXT,
    "triggeredById" UUID,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "template" "ReportTemplate" NOT NULL,
    "title" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "cron" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_shares" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_deliveries" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "channel" "ReportDeliveryChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "status" "ReportDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "white_label_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0F172A',
    "accentColor" TEXT NOT NULL DEFAULT '#2563EB',
    "footerText" TEXT,
    "shareDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "white_label_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "latestInvoiceId" TEXT,
    "latestInvoiceStatus" TEXT,
    "latestInvoiceAmount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "event" "UsageEvent" NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DECIMAL(10,6),
    "periodStart" TIMESTAMP(3),
    "actorId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_usage_quotas" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "scansUsed" INTEGER NOT NULL DEFAULT 0,
    "promptRunsUsed" INTEGER NOT NULL DEFAULT 0,
    "reportsUsed" INTEGER NOT NULL DEFAULT 0,
    "projectsActive" INTEGER NOT NULL DEFAULT 0,
    "seatsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "aiCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_usage_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectCreated" BOOLEAN NOT NULL DEFAULT false,
    "firstScanCompleted" BOOLEAN NOT NULL DEFAULT false,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "teamMemberInvited" BOOLEAN NOT NULL DEFAULT false,
    "integrationConnected" BOOLEAN NOT NULL DEFAULT false,
    "billingAdded" BOOLEAN NOT NULL DEFAULT false,
    "activationScore" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" TIMESTAMP(3),
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referralCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" UUID,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "sessionId" TEXT,
    "anonymousId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_shares" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "brandedExport" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scoring_configs_workspaceId_key" ON "scoring_configs"("workspaceId");

-- CreateIndex
CREATE INDEX "visibility_score_snapshots_workspaceId_day_idx" ON "visibility_score_snapshots"("workspaceId", "day");

-- CreateIndex
CREATE INDEX "visibility_score_snapshots_projectId_day_idx" ON "visibility_score_snapshots"("projectId", "day" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "visibility_score_snapshots_projectId_day_key" ON "visibility_score_snapshots"("projectId", "day");

-- CreateIndex
CREATE INDEX "competitor_daily_metrics_workspaceId_day_idx" ON "competitor_daily_metrics"("workspaceId", "day");

-- CreateIndex
CREATE INDEX "competitor_daily_metrics_projectId_entity_day_idx" ON "competitor_daily_metrics"("projectId", "entity", "day");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_daily_metrics_projectId_day_entity_key" ON "competitor_daily_metrics"("projectId", "day", "entity");

-- CreateIndex
CREATE INDEX "citation_daily_metrics_workspaceId_day_idx" ON "citation_daily_metrics"("workspaceId", "day");

-- CreateIndex
CREATE INDEX "citation_daily_metrics_projectId_domain_day_idx" ON "citation_daily_metrics"("projectId", "domain", "day");

-- CreateIndex
CREATE UNIQUE INDEX "citation_daily_metrics_projectId_day_domain_key" ON "citation_daily_metrics"("projectId", "day", "domain");

-- CreateIndex
CREATE INDEX "provider_volatility_metrics_workspaceId_day_idx" ON "provider_volatility_metrics"("workspaceId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "provider_volatility_metrics_projectId_day_provider_key" ON "provider_volatility_metrics"("projectId", "day", "provider");

-- CreateIndex
CREATE INDEX "insight_records_workspaceId_createdAt_idx" ON "insight_records"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "insight_records_projectId_severity_createdAt_idx" ON "insight_records"("projectId", "severity", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "insight_records_projectId_kind_forDay_key" ON "insight_records"("projectId", "kind", "forDay");

-- CreateIndex
CREATE INDEX "recommendations_workspaceId_status_priorityScore_idx" ON "recommendations"("workspaceId", "status", "priorityScore" DESC);

-- CreateIndex
CREATE INDEX "recommendations_projectId_category_status_idx" ON "recommendations"("projectId", "category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_projectId_kind_targetKey_key" ON "recommendations"("projectId", "kind", "targetKey");

-- CreateIndex
CREATE INDEX "reports_workspaceId_createdAt_idx" ON "reports"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "reports_projectId_createdAt_idx" ON "reports"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "reports_scheduleId_idx" ON "reports"("scheduleId");

-- CreateIndex
CREATE INDEX "report_schedules_workspaceId_active_idx" ON "report_schedules"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "report_schedules_nextRunAt_idx" ON "report_schedules"("nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "report_shares_token_key" ON "report_shares"("token");

-- CreateIndex
CREATE INDEX "report_shares_reportId_idx" ON "report_shares"("reportId");

-- CreateIndex
CREATE INDEX "report_deliveries_reportId_idx" ON "report_deliveries"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "white_label_configs_workspaceId_key" ON "white_label_configs"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_workspaceId_key" ON "subscriptions"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "usage_records_workspaceId_event_createdAt_idx" ON "usage_records"("workspaceId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "usage_records_workspaceId_periodStart_idx" ON "usage_records"("workspaceId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_usage_quotas_workspaceId_key" ON "workspace_usage_quotas"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_workspaceId_key" ON "onboarding_progress"("workspaceId");

-- CreateIndex
CREATE INDEX "analytics_events_workspaceId_event_createdAt_idx" ON "analytics_events"("workspaceId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_userId_event_createdAt_idx" ON "analytics_events"("userId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_event_createdAt_idx" ON "analytics_events"("event", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "insight_shares_token_key" ON "insight_shares"("token");

-- CreateIndex
CREATE INDEX "insight_shares_workspaceId_idx" ON "insight_shares"("workspaceId");

-- CreateIndex
CREATE INDEX "insight_shares_targetType_targetId_idx" ON "insight_shares"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "workspaces_subscriptionId_idx" ON "workspaces"("subscriptionId");

-- AddForeignKey
ALTER TABLE "scoring_configs" ADD CONSTRAINT "scoring_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visibility_score_snapshots" ADD CONSTRAINT "visibility_score_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_daily_metrics" ADD CONSTRAINT "competitor_daily_metrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_daily_metrics" ADD CONSTRAINT "citation_daily_metrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_volatility_metrics" ADD CONSTRAINT "provider_volatility_metrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_records" ADD CONSTRAINT "insight_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "white_label_configs" ADD CONSTRAINT "white_label_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_usage_quotas" ADD CONSTRAINT "workspace_usage_quotas_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

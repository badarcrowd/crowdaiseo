-- CreateEnum
CREATE TYPE "ProviderId" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'PERPLEXITY');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CACHED');

-- CreateEnum
CREATE TYPE "SentimentLabel" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');

-- CreateEnum
CREATE TYPE "MentionKind" AS ENUM ('BRAND', 'COMPETITOR');

-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intent" TEXT,
    "status" "PromptStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visibility_scans" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "promptIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providers" "ProviderId"[] DEFAULT ARRAY[]::"ProviderId"[],
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "completedRuns" INTEGER NOT NULL DEFAULT 0,
    "failedRuns" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "scoreBreakdown" JSONB,
    "triggeredById" UUID,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visibility_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_runs" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "provider" "ProviderId" NOT NULL,
    "model" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "rawResponse" TEXT,
    "responseHash" TEXT,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DECIMAL(10,6),
    "latencyMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "brandMentioned" BOOLEAN NOT NULL DEFAULT false,
    "brandRank" INTEGER,
    "sentimentLabel" "SentimentLabel",
    "sentimentScore" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" "MentionKind" NOT NULL,
    "entity" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "excerpt" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompts_workspaceId_status_idx" ON "prompts"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "prompts_projectId_idx" ON "prompts"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_promptId_version_key" ON "prompt_versions"("promptId", "version");

-- CreateIndex
CREATE INDEX "competitors_workspaceId_idx" ON "competitors"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_projectId_name_key" ON "competitors"("projectId", "name");

-- CreateIndex
CREATE INDEX "visibility_scans_workspaceId_createdAt_idx" ON "visibility_scans"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "visibility_scans_projectId_status_idx" ON "visibility_scans"("projectId", "status");

-- CreateIndex
CREATE INDEX "prompt_runs_workspaceId_createdAt_idx" ON "prompt_runs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "prompt_runs_scanId_status_idx" ON "prompt_runs"("scanId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_runs_scanId_promptId_provider_key" ON "prompt_runs"("scanId", "promptId", "provider");

-- CreateIndex
CREATE INDEX "mentions_runId_kind_idx" ON "mentions"("runId", "kind");

-- CreateIndex
CREATE INDEX "citations_runId_idx" ON "citations"("runId");

-- CreateIndex
CREATE INDEX "citations_domain_idx" ON "citations"("domain");

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visibility_scans" ADD CONSTRAINT "visibility_scans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "visibility_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "prompt_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_runId_fkey" FOREIGN KEY ("runId") REFERENCES "prompt_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

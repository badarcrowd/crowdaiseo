"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { OnboardingMilestone } from "../../domain/types";

type Milestone = {
  key: OnboardingMilestone;
  completed: boolean;
  weight: number;
};

type OnboardingChecklistProps = {
  milestones: Milestone[];
  activationScore: number;
  activated: boolean;
  className?: string;
};

const MILESTONE_LABELS: Record<OnboardingMilestone, { label: string; description: string }> = {
  projectCreated: {
    label: "Add your first project",
    description: "Connect a domain to track",
  },
  firstScanCompleted: {
    label: "Run an AI visibility scan",
    description: "See how AI models perceive your brand",
  },
  reportGenerated: {
    label: "Generate a report",
    description: "Export insights to share with stakeholders",
  },
  teamMemberInvited: {
    label: "Invite a teammate",
    description: "Collaborate with your team",
  },
  integrationConnected: {
    label: "Connect an integration",
    description: "Sync with your existing tools",
  },
  billingAdded: {
    label: "Add billing details",
    description: "Continue after your trial",
  },
};

export function OnboardingChecklist({
  milestones,
  activationScore,
  activated,
  className,
}: OnboardingChecklistProps) {
  const completed = milestones.filter((m) => m.completed).length;

  return (
    <div className={cn("rounded-xl border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Getting started</h3>
          <p className="text-sm text-muted-foreground">
            {completed} of {milestones.length} steps completed
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{activationScore}%</div>
          {activated && (
            <span className="text-xs text-emerald-600 font-medium">Activated</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${activationScore}%` }}
        />
      </div>

      <ul className="space-y-3">
        {milestones.map(({ key, completed }) => {
          const { label, description } = MILESTONE_LABELS[key];
          return (
            <li key={key} className="flex items-start gap-3">
              {completed ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" />
              )}
              <div className={cn(completed && "opacity-60")}>
                <p className={cn("text-sm font-medium", completed && "line-through decoration-muted-foreground/40")}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { PageContent, PageHeader } from "@/components/layout/app-shell";
import {
  ChartSkeleton,
  PanelSkeleton,
  ScoreCardSkeleton,
} from "@/components/dashboard/skeletons";

export default function Loading() {
  return (
    <>
      <PageHeader title="Dashboard" description="Loading insights…" />
      <PageContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ScoreCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <PanelSkeleton />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelSkeleton />
          <PanelSkeleton />
        </div>
      </PageContent>
    </>
  );
}

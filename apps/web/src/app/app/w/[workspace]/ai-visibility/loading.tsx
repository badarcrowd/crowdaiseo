import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AIVisibilityLoading() {
  return (
    <>
      <PageHeader
        title="AI Visibility"
        description="Loading analytics…"
      />
      <PageContent>
        <div className="space-y-6">
          {/* Filter bar skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-md" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border-border rounded-lg border p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-7 w-14" />
                <Skeleton className="mt-1.5 h-3 w-16" />
              </div>
            ))}
          </div>

          {/* Score + Matrix row */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-5">
                  <Skeleton className="h-28 w-28 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-44 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>

          {/* Chart pair rows */}
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, col) => (
                <Card key={col}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-44 w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}

          {/* Full-width table */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-md" />
            </CardContent>
          </Card>

          {/* Ranking chart */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}

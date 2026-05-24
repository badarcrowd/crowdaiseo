import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 md:p-8">
      {/* Premium top header loading skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded bg-muted/80 animate-pulse" />
      </div>

      {/* Shimmering metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden border border-border/50 shadow-none">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-4 rounded-full bg-muted/60 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="h-7 w-16 rounded bg-muted/80 animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted/40 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Large Content Skeleton with embedded loading spinner and elegant overlay */}
      <Card className="relative overflow-hidden border border-border/50 shadow-none min-h-[400px]">
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/30 backdrop-blur-[1px] z-10 gap-3">
          <div className="rounded-full bg-background/80 p-3 shadow-md border border-border/50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading workspace resources...
          </span>
        </div>

        <CardContent className="p-0">
          <div className="border-b border-border/50 px-5 py-4 flex items-center justify-between bg-muted/10">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-8 w-24 rounded bg-muted/60 animate-pulse" />
          </div>
          
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-4 w-1/3">
                  <div className="h-8 w-8 rounded-md bg-muted/70 animate-pulse shrink-0" />
                  <div className="space-y-1.5 w-full">
                    <div className="h-4 w-3/4 rounded bg-muted/80 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
                  </div>
                </div>
                
                <div className="h-4 w-20 rounded bg-muted/50 animate-pulse" />
                <div className="h-4 w-28 rounded bg-muted/60 animate-pulse" />
                <div className="h-6 w-16 rounded-full bg-muted/40 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

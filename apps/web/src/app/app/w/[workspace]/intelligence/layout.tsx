import { CommandPalette } from "@/components/command-palette";
import { IntelNav } from "./intel-nav";

export default async function IntelligenceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}>) {
  const { workspace: slug } = await params;
  const base = `/app/w/${slug}/intelligence`;
  const workspaceBase = `/app/w/${slug}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Intelligence sub-nav */}
      <div className="border-border bg-card/50 border-b">
        <div className="flex items-center gap-0 overflow-x-auto px-4 md:px-8">
          <IntelNav base={base} />
          <div className="ml-auto shrink-0 py-2 pl-4">
            <CommandPalette basePath={workspaceBase} />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

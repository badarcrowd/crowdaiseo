import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  basePath = "",
  workspaceName,
  workspaceSlug,
  userName,
  topbarExtras,
}: Readonly<{
  children: React.ReactNode;
  basePath?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  userName?: string;
  topbarExtras?: React.ReactNode;
}>) {
  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar basePath={basePath} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          workspaceName={workspaceName}
          workspaceSlug={workspaceSlug}
          userName={userName}
          extras={topbarExtras}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-6 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageContent({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div className={`px-4 py-6 md:px-8 ${className ?? ""}`}>{children}</div>
  );
}

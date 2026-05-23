import { requireUserOrRedirect } from "@/lib/auth/session";

/**
 * Protected shell. Middleware already enforces auth, but RSC re-checks
 * defensively (defense-in-depth). Workspace-scoped chrome (switcher,
 * nav) lives in /app/w/[workspace]/layout — it depends on a resolved
 * workspace, which isn't available on /app or /onboarding.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireUserOrRedirect();
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}

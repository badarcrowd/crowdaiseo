import { notFound } from "next/navigation";
import { accessShare } from "@/modules/reports";

/**
 * Public report share page.
 *
 * No authentication. Multi-tenant safety is enforced by the
 * HMAC-signed token + the report's storage path being scoped to the
 * owning workspace. The signed PDF URL expires in 5 minutes, so
 * sharing this URL itself won't expose the document long-term.
 */
export const dynamic = "force-dynamic";

export default async function ReportShareViewerPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const result = await accessShare(token);
  if (!result.ok) {
    if (result.reason === "not-found") notFound();
    return (
      <main className="container mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Report unavailable</h1>
        <p className="text-muted-foreground mt-3">
          {result.reason === "expired"
            ? "This share link has expired."
            : result.reason === "revoked"
              ? "This share link was revoked."
              : "The report is still rendering. Try again in a moment."}
        </p>
      </main>
    );
  }
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-base font-semibold">{result.title}</h1>
          <p className="text-muted-foreground text-xs">
            Shared report · viewed {result.viewCount} time
            {result.viewCount === 1 ? "" : "s"}
          </p>
        </div>
        <a
          className="text-sm underline"
          href={result.signedPdfUrl}
          download
          rel="noopener"
        >
          Download PDF
        </a>
      </header>
      <iframe
        src={result.signedPdfUrl}
        title={result.title}
        className="flex-1 border-0"
      />
    </div>
  );
}

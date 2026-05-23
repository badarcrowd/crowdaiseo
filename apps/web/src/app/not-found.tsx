import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Link href="/" className="text-sm underline">
        Back home
      </Link>
    </main>
  );
}

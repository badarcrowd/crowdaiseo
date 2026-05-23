import Link from "next/link";
import { SignInForm } from "@/modules/auth/presentation/sign-in-form";

export default async function SignInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ redirect?: string }>;
}>) {
  const { redirect } = await searchParams;
  return (
    <section className="bg-card rounded-lg border p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Welcome back. Sign in to continue.
      </p>
      <SignInForm redirectTo={redirect} />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </section>
  );
}

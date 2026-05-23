import Link from "next/link";
import { SignUpForm } from "@/modules/auth/presentation/sign-up-form";

export default function SignUpPage() {
  return (
    <section className="bg-card rounded-lg border p-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Get started in seconds.
      </p>
      <SignUpForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}

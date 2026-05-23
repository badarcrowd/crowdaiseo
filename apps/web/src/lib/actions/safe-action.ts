import "server-only";
import { z } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/observability/sentry";

/**
 * Discriminated result type for server actions consumed by the UI. The
 * client always gets a structured response — never a thrown error — so
 * `useFormState` / `useActionState` can render messages safely.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
    };

type ActionHandler<I, O> = (input: I) => Promise<O>;

/**
 * Wrap a server-action handler with Zod validation and uniform error
 * mapping. The wrapper never throws to the client.
 */
export const safeAction = <S extends z.ZodTypeAny, O>(
  schema: S,
  handler: ActionHandler<z.infer<S>, O>,
) => {
  return async (raw: unknown): Promise<ActionResult<O>> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      };
    }
    try {
      const data = await handler(parsed.data);
      return { ok: true, data };
    } catch (err) {
      // Next.js uses thrown errors for redirect() / notFound() — let them through.
      if (isRedirectError(err)) throw err;
      if (isAppError(err)) {
        return { ok: false, error: { code: err.code, message: err.message } };
      }
      logger.error({ err: err instanceof Error ? err.message : err }, "safeAction: unexpected error");
      captureException(err);
      return { ok: false, error: { code: "INTERNAL", message: "Something went wrong" } };
    }
  };
};

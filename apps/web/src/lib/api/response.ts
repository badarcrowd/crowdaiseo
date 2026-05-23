import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Standard API envelopes. Every route handler should return `ok()` or
 * funnel thrown errors through `fail()` so clients see a consistent
 * shape: `{ data }` on success, `{ error: { code, message, details? } }`
 * on failure.
 */
export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ data }, { status: 200, ...init });

export const created = <T>(data: T) => NextResponse.json({ data }, { status: 201 });

export const noContent = () => new NextResponse(null, { status: 204 });

export const fail = (err: unknown) => {
  if (isAppError(err)) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.expose ? err.message : "Request failed",
          details: err.expose ? err.details : undefined,
        },
      },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Invalid input",
          details: err.flatten(),
        },
      },
      { status: 422 },
    );
  }

  logger.error({ err }, "Unhandled API error");
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Internal server error" } },
    { status: 500 },
  );
};

export const withErrorHandling = <Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) => {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return fail(err);
    }
  };
};

export { AppError };

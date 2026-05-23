/**
 * Domain error hierarchy. All thrown errors should extend `AppError` so
 * the API layer can map them to consistent HTTP responses without
 * leaking internals.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTEGRATION_FAILURE"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly expose: boolean; // safe to send to client?

  constructor(opts: {
    code: ErrorCode;
    message: string;
    status?: number;
    details?: unknown;
    expose?: boolean;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = "AppError";
    this.code = opts.code;
    this.status = opts.status ?? statusForCode(opts.code);
    this.details = opts.details;
    this.expose = opts.expose ?? true;
  }
}

const statusForCode = (code: ErrorCode): number => {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION":
      return 422;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "INTEGRATION_FAILURE":
      return 502;
    case "INTERNAL":
    default:
      return 500;
  }
};

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

export const Unauthenticated = (msg = "Authentication required") =>
  new AppError({ code: "UNAUTHENTICATED", message: msg });

export const Forbidden = (msg = "You do not have access to this resource") =>
  new AppError({ code: "FORBIDDEN", message: msg });

export const NotFound = (resource: string) =>
  new AppError({ code: "NOT_FOUND", message: `${resource} not found` });

export const ValidationError = (details: unknown, msg = "Invalid input") =>
  new AppError({ code: "VALIDATION", message: msg, details });

export const Conflict = (msg: string) =>
  new AppError({ code: "CONFLICT", message: msg });

export const ServiceUnavailable = (msg = "Service temporarily unavailable") =>
  new AppError({ code: "INTEGRATION_FAILURE", message: msg, status: 503 });

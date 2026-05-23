import { logger } from "@/lib/logger";
import { inc } from "@/lib/observability/metrics";

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

interface ProviderCircuit {
  state: State;
  failures: number;
  lastFailureAt: number;
  openedAt: number;
}

// Thresholds — open the circuit after this many consecutive failures.
const FAILURE_THRESHOLD = 5;
// After RESET_TIMEOUT ms in OPEN state, allow one probe (HALF_OPEN).
const RESET_TIMEOUT_MS = 60_000;

const circuits = new Map<string, ProviderCircuit>();

const getOrCreate = (provider: string): ProviderCircuit => {
  let c = circuits.get(provider);
  if (!c) {
    c = { state: "CLOSED", failures: 0, lastFailureAt: 0, openedAt: 0 };
    circuits.set(provider, c);
  }
  return c;
};

/**
 * Call before every provider invocation. Throws if the circuit is OPEN.
 * In HALF_OPEN state one probe is allowed through.
 */
export const beforeCall = (provider: string): void => {
  const c = getOrCreate(provider);
  if (c.state === "CLOSED") return;

  if (c.state === "OPEN") {
    const elapsed = Date.now() - c.openedAt;
    if (elapsed < RESET_TIMEOUT_MS) {
      inc("circuit_breaker_rejected_total", { provider });
      throw new Error(
        `[circuit-breaker] Provider ${provider} is OPEN — retry in ${Math.ceil((RESET_TIMEOUT_MS - elapsed) / 1000)}s`,
      );
    }
    // Transition to HALF_OPEN: allow one probe through.
    c.state = "HALF_OPEN";
    logger.info({ provider }, "circuit-breaker: HALF_OPEN probe allowed");
  }
  // HALF_OPEN falls through — the call proceeds.
};

/**
 * Call on provider success. Resets the failure counter and closes the circuit.
 */
export const onSuccess = (provider: string): void => {
  const c = getOrCreate(provider);
  if (c.state === "HALF_OPEN") {
    logger.info({ provider }, "circuit-breaker: CLOSED (recovered)");
    inc("circuit_breaker_recovered_total", { provider });
  }
  c.state = "CLOSED";
  c.failures = 0;
};

/**
 * Call on provider failure. Opens the circuit after FAILURE_THRESHOLD hits.
 */
export const onFailure = (provider: string): void => {
  const c = getOrCreate(provider);
  c.failures += 1;
  c.lastFailureAt = Date.now();
  inc("circuit_breaker_failure_total", { provider });

  if (c.state === "HALF_OPEN" || c.failures >= FAILURE_THRESHOLD) {
    c.state = "OPEN";
    c.openedAt = Date.now();
    logger.error(
      { provider, failures: c.failures },
      "circuit-breaker: OPEN — provider failing repeatedly",
    );
    inc("circuit_breaker_opened_total", { provider });
  }
};

/** Returns a snapshot of all circuit states — used by the health endpoint. */
export const circuitSnapshot = (): Array<{
  provider: string;
  state: State;
  failures: number;
  openedAt: string | null;
}> =>
  [...circuits.entries()].map(([provider, c]) => ({
    provider,
    state: c.state,
    failures: c.failures,
    openedAt: c.openedAt > 0 ? new Date(c.openedAt).toISOString() : null,
  }));

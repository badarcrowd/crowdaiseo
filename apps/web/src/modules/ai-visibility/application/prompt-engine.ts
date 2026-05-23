import { createHash } from "node:crypto";
import type { ProviderId } from "@prisma/client";
import { ValidationError } from "@/lib/errors";
import type { PromptInput, RenderedPrompt } from "../domain/entities";

/**
 * Render a prompt template against a variables map.
 *
 * Syntax: `{{name}}` — replaced verbatim with the value. Unknown
 * variables throw at render time; that's intentional so we never quietly
 * send a half-rendered prompt to a paid LLM.
 *
 * Render output is hashed (prompt + provider) so identical effective
 * requests dedupe through the response cache regardless of how the
 * variables were ordered.
 */
const VAR_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export const renderPrompt = (
  prompt: PromptInput,
  variables: Record<string, string>,
  provider: ProviderId,
): RenderedPrompt => {
  const missing = (prompt.variables ?? [])
    .filter((v) => v.required !== false && !(v.name in variables))
    .map((v) => v.name);
  if (missing.length > 0) {
    throw ValidationError(
      { missing },
      `Prompt "${prompt.name}" missing required variables: ${missing.join(", ")}`,
    );
  }

  const used = new Set<string>();
  const content = prompt.content.replace(VAR_RE, (_, name: string) => {
    if (!(name in variables)) {
      throw ValidationError(null, `Unknown variable in prompt: ${name}`);
    }
    used.add(name);
    return variables[name];
  });

  // Hash uses provider so the same text against different models still
  // creates separate cache entries (they may return different answers).
  const contentHash = createHash("sha256")
    .update(provider)
    .update("\0")
    .update(content)
    .digest("hex");

  return {
    promptId: prompt.id,
    promptVersion: prompt.version,
    content,
    contentHash,
  };
};

import { aiOrchestrator } from "../orchestrator";
import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";

/**
 * Register concrete adapters with the orchestrator. Import this module
 * once at server bootstrap (e.g. from `instrumentation.ts`).
 */
export const registerAiProviders = () => {
  aiOrchestrator.register(anthropicAdapter);
  aiOrchestrator.register(openaiAdapter);
};

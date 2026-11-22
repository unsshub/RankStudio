import type { EngineConfig } from "./config.js";
import type { DbContext } from "./db/client.js";
import type { SseHub } from "./lib/sse.js";
import type { SfxIndex } from "./lib/sfxIndex.js";
import type { JobRunner } from "./jobs/runner.js";
import type { GeminiClient } from "./jobs/voiceover.js";

export interface EngineContext {
  config: EngineConfig;
  token: string;
  db: DbContext;
  sse: SseHub;
  sfxIndex: SfxIndex;
  jobRunner: JobRunner;
  geminiClient: GeminiClient | null;
  engineUrl: string;
}

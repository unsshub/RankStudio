export type ProjectStatus = "DRAFT" | "RENDERING" | "COMPLETED" | "FAILED";
export type AssetKind = "VIDEO" | "VOICE" | "SFX_UPLOAD";
export type AssetStatus = "PENDING" | "READY" | "FAILED";
export type JobType = "INGEST" | "RENDER" | "VOICEOVER";
export type JobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export interface HealthResponse {
  ok: boolean;
  version: string;
  gemini: boolean;
  sfxDir: string;
  paired: boolean;
}

export interface ProjectRecord<TData = unknown> {
  id: string;
  tool: string;
  name: string;
  data: TData;
  status: ProjectStatus;
  progress: number;
  outputPath: string | null;
  thumbPath: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AssetRecord {
  id: string;
  kind: AssetKind;
  path: string;
  proxyPath?: string | null;
  origName: string;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  filmstrip: string | null;
  waveform: string | null;
  status: AssetStatus;
  error: string | null;
  createdAt: number;
}

export interface SfxItem {
  id: string;
  name: string;
  category: string;
  durationSec: number;
  url: string;
  path: string;
}

export type SseEvent =
  | {
      type: "project.progress";
      projectId: string;
      progress: number;
    }
  | {
      type: "project.status";
      projectId: string;
      status: ProjectStatus;
      progress?: number;
      outputPath?: string | null;
      thumbPath?: string | null;
      error?: string | null;
    }
  | {
      type: "asset.status";
      assetId: string;
      status: AssetStatus;
      durationSec?: number | null;
      width?: number | null;
      height?: number | null;
      filmstrip?: string | null;
      waveform?: string | null;
      error?: string | null;
    };

export interface AiScriptRequest {
  topic: string;
  tone: string;
  length: "short" | "medium" | "long";
  hook: string;
  cta: string;
}

export interface AiScriptResponse {
  script: string;
}

export interface AiVoiceRequest {
  script: string;
  voiceId: string;
  projectId?: string;
  clipId?: string;
}

export interface AiVoiceResponse {
  jobId: string;
  assetId: string;
}

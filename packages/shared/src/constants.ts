export const ENGINE_DEFAULT_URL = "http://127.0.0.1:4000";
export const ENGINE_TOKEN_HEADER = "X-RankStudio-Token";
export const MAX_UPLOAD_MB = 500;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"] as const;
export const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"] as const;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;
export const TRANSITION_DURATION_SEC = 0.5;
export const MIN_CLIP_DURATION_SEC = 0.5;

export const SIDEBAR_TOOLS = [
  { slug: "video-ranking", name: "Video Ranking", implemented: true },
  { slug: "split-screen", name: "Split Screen", implemented: false },
  { slug: "reddit-story", name: "Reddit Story", implemented: false },
  { slug: "fake-text", name: "Fake Text", implemented: false },
  { slug: "would-you-rather", name: "Would You Rather", implemented: false },
  { slug: "ai-captions", name: "AI Captions", implemented: false },
  { slug: "quiz-video", name: "Quiz Video", implemented: false },
  { slug: "tier-list", name: "Tier List", implemented: false },
] as const;

export const API_ROUTES = {
  health: "/health",
  projects: "/projects",
  project: (id: string) => `/projects/${id}`,
  projectDuplicate: (id: string, template = true) =>
    `/projects/${id}/duplicate${template ? "?template=1" : ""}`,
  projectRender: (id: string) => `/projects/${id}/render`,
  projectRenderCancel: (id: string) => `/projects/${id}/render/cancel`,
  events: "/events",
  assetsUpload: "/assets/upload",
  assets: "/assets",
  asset: (id: string) => `/assets/${id}`,
  sfx: "/sfx",
  files: "/files",
  renderDownload: (projectId: string) => `/renders/${projectId}/download`,
  aiScript: "/ai/script",
  aiVoice: "/ai/voice",
} as const;

import path from "node:path";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const EnvSchema = z.object({
  ENGINE_HOST: z.string().default("127.0.0.1"),
  ENGINE_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATA_DIR: z.string().default("./data"),
  SFX_DIR: z.string().default("/home/unss/Desktop/Sound Effects"),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://127.0.0.1:4000"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(500),
  RENDER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  GEMINI_API_KEY: z.string().optional().default(""),
  GITHUB_PAGES_URL: z.string().optional().default(""),
});

export interface EngineConfig {
  host: string;
  port: number;
  dataDir: string;
  sfxDir: string;
  allowedOrigins: string[];
  maxUploadMb: number;
  maxUploadBytes: number;
  renderConcurrency: number;
  geminiApiKey: string;
  githubPagesUrl: string;
}

export function loadConfig(overrides: Partial<Record<string, string>> = {}): EngineConfig {
  const merged = { ...process.env, ...overrides };
  const parsed = EnvSchema.parse(merged);
  const rootDir = path.resolve(process.cwd());
  const dataDir = path.isAbsolute(parsed.DATA_DIR)
    ? parsed.DATA_DIR
    : path.resolve(rootDir, parsed.DATA_DIR);
  const sfxDir = path.isAbsolute(parsed.SFX_DIR)
    ? parsed.SFX_DIR
    : path.resolve(rootDir, parsed.SFX_DIR);

  const allowedOrigins = parsed.ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    host: parsed.ENGINE_HOST,
    port: parsed.ENGINE_PORT,
    dataDir,
    sfxDir,
    allowedOrigins,
    maxUploadMb: parsed.MAX_UPLOAD_MB,
    maxUploadBytes: parsed.MAX_UPLOAD_MB * 1024 * 1024,
    renderConcurrency: parsed.RENDER_CONCURRENCY,
    geminiApiKey: parsed.GEMINI_API_KEY.trim(),
    githubPagesUrl: parsed.GITHUB_PAGES_URL.trim(),
  };
}

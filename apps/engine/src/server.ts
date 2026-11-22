import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { ENGINE_TOKEN_HEADER } from "@rankstudio/shared";
import { loadConfig, type EngineConfig } from "./config.js";
import { loadOrCreateToken, verifyToken } from "./auth.js";
import { createDb } from "./db/client.js";
import { SseHub } from "./lib/sse.js";
import { SfxIndex } from "./lib/sfxIndex.js";
import { JobRunner } from "./jobs/runner.js";
import { createGeminiClient, type GeminiClient } from "./jobs/voiceover.js";
import type { EngineContext } from "./context.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerAssetRoutes } from "./routes/assets.js";
import { registerSfxRoutes } from "./routes/sfx.js";
import { registerFileRoutes } from "./routes/files.js";
import { registerRenderRoutes } from "./routes/renders.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerAiRoutes } from "./routes/ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CreateServerOptions {
  config?: EngineConfig;
  geminiClient?: GeminiClient | null;
  startJobRunner?: boolean;
  serveWebDist?: boolean;
}

export interface EngineServer {
  app: FastifyInstance;
  ctx: EngineContext;
  close: () => Promise<void>;
}

const API_PREFIXES = [
  "/health",
  "/projects",
  "/assets",
  "/sfx",
  "/files",
  "/renders",
  "/events",
  "/ai",
];

function isApiPath(url: string): boolean {
  const pathname = url.split("?")[0];
  return API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function createServer(
  opts: CreateServerOptions = {}
): Promise<EngineServer> {
  const config = opts.config ?? loadConfig();
  const token = loadOrCreateToken(config.dataDir);
  const db = createDb(config.dataDir);
  const sse = new SseHub();
  const sfxIndex = new SfxIndex(config.sfxDir, config.dataDir);
  const geminiClient =
    opts.geminiClient !== undefined
      ? opts.geminiClient
      : createGeminiClient(config.geminiApiKey);
  const engineUrl = `http://${config.host}:${config.port}`;

  const jobRunner = new JobRunner({
    dataDir: config.dataDir,
    engineUrl,
    token,
    renderConcurrency: config.renderConcurrency,
    dbCtx: db,
    sse,
    sfxIndex,
    geminiClient,
  });

  const ctx: EngineContext = {
    config,
    token,
    db,
    sse,
    sfxIndex,
    jobRunner,
    geminiClient,
    engineUrl,
  };

  const app = Fastify({
    logger: false,
    bodyLimit: 20 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (config.allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", ENGINE_TOKEN_HEADER, "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Disposition"],
    credentials: true,
  });

  // Add Chrome 142+ Private Network Access preflight header
  app.addHook("onSend", async (req, reply, payload) => {
    if (req.method === "OPTIONS" || req.headers["access-control-request-private-network"]) {
      reply.header("Access-Control-Allow-Private-Network", "true");
    }
    return payload;
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.maxUploadBytes,
    },
  });

  // Reject disallowed origins on non-OPTIONS requests with 403
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: "Origin not allowed" });
    }
  });

  // Pairing token auth hook for all API routes except /health and OPTIONS
  app.addHook("onRequest", async (req, reply) => {
    if (req.method === "OPTIONS") return;
    const pathname = req.url.split("?")[0];
    if (!isApiPath(pathname) || pathname === "/health") return;

    const headerToken = req.headers[ENGINE_TOKEN_HEADER.toLowerCase()];
    const queryToken = (req.query as { t?: string } | undefined)?.t;
    const candidate =
      typeof headerToken === "string"
        ? headerToken
        : typeof queryToken === "string"
          ? queryToken
          : undefined;

    if (!verifyToken(candidate, token)) {
      return reply.code(401).send({ error: "Invalid or missing pairing token" });
    }
  });

  registerHealthRoutes(app, ctx);
  registerProjectRoutes(app, ctx);
  registerAssetRoutes(app, ctx);
  registerSfxRoutes(app, ctx);
  registerFileRoutes(app, ctx);
  registerRenderRoutes(app, ctx);
  registerEventRoutes(app, ctx);
  registerAiRoutes(app, ctx);

  // Optionally serve built frontend at / for offline mode
  if (opts.serveWebDist !== false) {
    const webDist = path.resolve(__dirname, "../../web/dist");
    if (fs.existsSync(webDist)) {
      await app.register(fastifyStatic, {
        root: webDist,
        prefix: "/",
      });
    }
  }

  if (opts.startJobRunner !== false) {
    jobRunner.start();
  }

  return {
    app,
    ctx,
    close: async () => {
      jobRunner.stop();
      sse.closeAll();
      await app.close();
      db.close();
    },
  };
}

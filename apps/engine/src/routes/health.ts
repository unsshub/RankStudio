import type { FastifyInstance } from "fastify";
import { ENGINE_TOKEN_HEADER, type HealthResponse } from "@rankstudio/shared";
import type { EngineContext } from "../context.js";
import { verifyToken } from "../auth.js";

export function registerHealthRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.get("/health", async (req): Promise<HealthResponse> => {
    const headerToken = req.headers[ENGINE_TOKEN_HEADER.toLowerCase()];
    const queryToken = (req.query as { t?: string } | undefined)?.t;
    const candidate =
      typeof headerToken === "string"
        ? headerToken
        : typeof queryToken === "string"
          ? queryToken
          : undefined;

    return {
      ok: true,
      version: "0.1.0",
      gemini: Boolean(ctx.geminiClient),
      sfxDir: ctx.config.sfxDir,
      paired: verifyToken(candidate, ctx.token),
    };
  });
}

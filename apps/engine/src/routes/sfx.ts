import type { FastifyInstance } from "fastify";
import type { EngineContext } from "../context.js";

export function registerSfxRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.get("/sfx", async (req) => {
    const q = (req.query as { q?: string } | undefined)?.q;
    return ctx.sfxIndex.list(q);
  });
}

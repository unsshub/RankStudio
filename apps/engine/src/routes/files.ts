import type { FastifyInstance } from "fastify";
import type { EngineContext } from "../context.js";
import { safeResolve } from "../lib/paths.js";
import { streamWithRange } from "../lib/range.js";

export function registerFileRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.get("/files/*", async (req, reply) => {
    const rawWildcard = (req.params as { "*": string })["*"];
    const resolved = safeResolve([ctx.config.dataDir, ctx.config.sfxDir], rawWildcard);
    if (!resolved) {
      return reply.code(404).send({ error: "File not found" });
    }
    return streamWithRange(req, reply, resolved);
  });
}

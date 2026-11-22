import type { FastifyInstance } from "fastify";
import type { EngineContext } from "../context.js";

export function registerEventRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.get("/events", async (req, reply) => {
    const origin = req.headers.origin;
    reply.hijack();
    const res = reply.raw;
    const headers: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };
    if (origin && ctx.config.allowedOrigins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Credentials"] = "true";
    }
    res.writeHead(200, headers);
    res.write(`event: connected\ndata: {"ok":true}\n\n`);
    ctx.sse.add(res);
  });
}

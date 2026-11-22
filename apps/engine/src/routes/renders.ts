import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { projects } from "../db/schema.js";
import type { EngineContext } from "../context.js";

export function registerRenderRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.get("/renders/:projectId/download", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const [row] = ctx.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .all();
    if (!row || !row.outputPath) {
      return reply.code(404).send({ error: "Rendered file not found" });
    }
    const fullPath = path.join(ctx.config.dataDir, row.outputPath);
    if (!fs.existsSync(fullPath)) {
      return reply.code(404).send({ error: "Rendered file missing on disk" });
    }

    const safeFileName = `${row.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "rankstudio"}.mp4`;
    const stat = fs.statSync(fullPath);
    reply.header("Content-Type", "video/mp4");
    reply.header("Content-Length", stat.size);
    reply.header("Content-Disposition", `attachment; filename="${safeFileName}"`);
    return reply.send(fs.createReadStream(fullPath));
  });
}

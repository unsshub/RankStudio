import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import {
  defaultProject,
  migrate,
  RankingProject,
  type RankingProject as RankingProjectType,
} from "@rankstudio/composition";
import { assets, projects } from "../db/schema.js";
import type { EngineContext } from "../context.js";

function serializeProject(row: typeof projects.$inferSelect) {
  return {
    id: row.id,
    tool: row.tool,
    name: row.name,
    data: migrate(row.data),
    status: row.status,
    progress: row.progress,
    outputPath: row.outputPath,
    thumbPath: row.thumbPath,
    error: row.error,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export function registerProjectRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.get("/projects", async (req) => {
    const tool = (req.query as { tool?: string } | undefined)?.tool;
    const rows = tool
      ? ctx.db.db
          .select()
          .from(projects)
          .where(eq(projects.tool, tool))
          .orderBy(desc(projects.updatedAt))
          .all()
      : ctx.db.db.select().from(projects).orderBy(desc(projects.updatedAt)).all();
    return rows.map(serializeProject);
  });

  app.post("/projects", async (req, reply) => {
    const body = (req.body ?? {}) as { name?: string; tool?: string; data?: unknown };
    const id = crypto.randomUUID();
    const now = new Date();
    const data = body.data ? migrate(body.data) : defaultProject();
    const name = body.name?.trim() || "Untitled Video Ranking";
    const tool = body.tool?.trim() || "video-ranking";

    ctx.db.db
      .insert(projects)
      .values({
        id,
        tool,
        name,
        data,
        status: "DRAFT",
        progress: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const [created] = ctx.db.db.select().from(projects).where(eq(projects.id, id)).all();
    return reply.code(201).send(serializeProject(created));
  });

  app.get("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [row] = ctx.db.db.select().from(projects).where(eq(projects.id, id)).all();
    if (!row) return reply.code(404).send({ error: "Project not found" });
    return serializeProject(row);
  });

  app.patch("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [existing] = ctx.db.db.select().from(projects).where(eq(projects.id, id)).all();
    if (!existing) return reply.code(404).send({ error: "Project not found" });

    const body = (req.body ?? {}) as { name?: string; data?: unknown };
    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (body.data !== undefined) {
      const parsed = RankingProject.safeParse(body.data);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid project data",
          details: parsed.error.flatten(),
        });
      }
      updates.data = parsed.data;
    }

    ctx.db.db.update(projects).set(updates).where(eq(projects.id, id)).run();
    const [updated] = ctx.db.db.select().from(projects).where(eq(projects.id, id)).all();
    return serializeProject(updated);
  });

  app.delete("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [existing] = ctx.db.db.select().from(projects).where(eq(projects.id, id)).all();
    if (!existing) return reply.code(404).send({ error: "Project not found" });

    ctx.jobRunner.cancelRender(id);
    ctx.db.db.delete(projects).where(eq(projects.id, id)).run();

    const renderDir = path.join(ctx.config.dataDir, "renders", id);
    if (fs.existsSync(renderDir)) {
      fs.rmSync(renderDir, { recursive: true, force: true });
    }
    return reply.code(204).send();
  });

  app.post("/projects/:id/duplicate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const isTemplate = (req.query as { template?: string } | undefined)?.template === "1";
    const [existing] = ctx.db.db.select().from(projects).where(eq(projects.id, id)).all();
    if (!existing) return reply.code(404).send({ error: "Project not found" });

    const sourceData: RankingProjectType = migrate(existing.data);
    const clonedData: RankingProjectType = isTemplate
      ? {
          ...sourceData,
          clips: sourceData.clips.map((clip) => ({
            ...clip,
            media: { assetId: null, durationSec: null, width: null, height: null },
            trim: { startSec: 0, endSec: 3 },
            voiceover: {
              ...clip.voiceover,
              audioAssetId: null,
            },
          })),
        }
      : sourceData;

    const newId = crypto.randomUUID();
    const now = new Date();
    const newName = isTemplate ? `${existing.name} (Template)` : `${existing.name} (Copy)`;

    ctx.db.db
      .insert(projects)
      .values({
        id: newId,
        tool: existing.tool,
        name: newName,
        data: clonedData,
        status: "DRAFT",
        progress: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const [created] = ctx.db.db.select().from(projects).where(eq(projects.id, newId)).all();
    return reply.code(201).send(serializeProject(created));
  });

  app.post("/projects/:id/render", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [row] = ctx.db.db.select().from(projects).where(eq(projects.id, id)).all();
    if (!row) return reply.code(404).send({ error: "Project not found" });

    const data = migrate(row.data);
    const assetRows = ctx.db.db.select().from(assets).all();
    const assetById = new Map(assetRows.map((a) => [a.id, a]));

    for (const clip of data.clips) {
      if (!clip.media.assetId) {
        return reply.code(400).send({
          error: `Clip #${clip.rank} is missing a video upload`,
        });
      }
      const asset = assetById.get(clip.media.assetId);
      if (!asset || asset.status !== "READY") {
        return reply.code(400).send({
          error: `Clip #${clip.rank} media is not READY`,
        });
      }
      if (clip.trim.endSec - clip.trim.startSec < 0.5) {
        return reply.code(400).send({
          error: `Clip #${clip.rank} trim must be at least 0.5 seconds`,
        });
      }
    }

    const now = new Date();
    ctx.db.db
      .update(projects)
      .set({
        status: "RENDERING",
        progress: 0,
        error: null,
        updatedAt: now,
      })
      .where(eq(projects.id, id))
      .run();

    ctx.sse.emit({
      type: "project.status",
      projectId: id,
      status: "RENDERING",
      progress: 0,
      error: null,
    });

    const jobId = ctx.jobRunner.enqueue("RENDER", { projectId: id });
    return reply.code(202).send({ jobId, projectId: id, status: "RENDERING" });
  });

  app.post("/projects/:id/render/cancel", async (req, reply) => {
    const { id } = req.params as { id: string };
    const cancelled = ctx.jobRunner.cancelRender(id);
    if (!cancelled) {
      return reply.code(404).send({ error: "No active render for this project" });
    }
    return { ok: true, projectId: id };
  });
}

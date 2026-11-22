import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import type { AssetKind } from "@rankstudio/shared";
import { assets } from "../db/schema.js";
import type { EngineContext } from "../context.js";

const VALID_KINDS = new Set<AssetKind>(["VIDEO", "VOICE", "SFX_UPLOAD"]);

function serializeAsset(row: typeof assets.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    path: row.path,
    origName: row.origName,
    durationSec: row.durationSec,
    width: row.width,
    height: row.height,
    filmstrip: row.filmstrip,
    waveform: row.waveform,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.getTime(),
  };
}

export function registerAssetRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.get("/assets", async (req) => {
    const kind = (req.query as { kind?: string } | undefined)?.kind;
    const rows = kind
      ? ctx.db.db
          .select()
          .from(assets)
          .where(eq(assets.kind, kind))
          .orderBy(desc(assets.createdAt))
          .all()
      : ctx.db.db.select().from(assets).orderBy(desc(assets.createdAt)).all();
    return rows.map(serializeAsset);
  });

  app.get("/assets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [row] = ctx.db.db.select().from(assets).where(eq(assets.id, id)).all();
    if (!row) return reply.code(404).send({ error: "Asset not found" });
    return serializeAsset(row);
  });

  app.post("/assets/upload", async (req, reply) => {
    const queryKind = (req.query as { kind?: string } | undefined)?.kind;
    const part = await req.file({
      limits: {
        fileSize: ctx.config.maxUploadBytes,
      },
    });
    if (!part) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    const fieldKind =
      part.fields.kind && "value" in part.fields.kind
        ? String(part.fields.kind.value)
        : undefined;
    const kind = (queryKind ?? fieldKind ?? "VIDEO").toUpperCase() as AssetKind;
    if (!VALID_KINDS.has(kind)) {
      return reply.code(400).send({ error: `Invalid asset kind: ${kind}` });
    }

    const id = crypto.randomUUID();
    const origName = part.filename || "upload.bin";
    const ext = (path.extname(origName) || ".bin").toLowerCase().replace(/[^a-z0-9.]/g, "");

    let destFullPath: string;
    if (kind === "VIDEO") {
      const dir = path.join(ctx.config.dataDir, "media", id);
      fs.mkdirSync(dir, { recursive: true });
      destFullPath = path.join(dir, `source${ext}`);
    } else if (kind === "VOICE") {
      const dir = path.join(ctx.config.dataDir, "voices");
      fs.mkdirSync(dir, { recursive: true });
      destFullPath = path.join(dir, `${id}${ext}`);
    } else {
      const dir = path.join(ctx.config.dataDir, "sfx-uploads");
      fs.mkdirSync(dir, { recursive: true });
      const safeStem = path
        .basename(origName, path.extname(origName))
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 60);
      destFullPath = path.join(dir, `${safeStem || id}_${id.slice(0, 6)}${ext}`);
    }

    await pipeline(part.file, fs.createWriteStream(destFullPath));

    const relPath = path.relative(ctx.config.dataDir, destFullPath).replace(/\\/g, "/");
    const now = new Date();
    ctx.db.db
      .insert(assets)
      .values({
        id,
        kind,
        path: relPath,
        origName,
        status: "PENDING",
        createdAt: now,
      })
      .run();

    ctx.jobRunner.enqueue("INGEST", { assetId: id });
    const [created] = ctx.db.db.select().from(assets).where(eq(assets.id, id)).all();
    return reply.code(201).send(serializeAsset(created));
  });
}

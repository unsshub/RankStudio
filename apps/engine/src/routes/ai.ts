import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assets } from "../db/schema.js";
import type { EngineContext } from "../context.js";

const ScriptSchema = z.object({
  topic: z.string().min(1),
  tone: z.string().default("energetic"),
  length: z.enum(["short", "medium", "long"]).default("short"),
  hook: z.string().default(""),
  cta: z.string().default(""),
});

const VoiceSchema = z.object({
  script: z.string().min(1),
  voiceId: z.string().default("Kore"),
});

export function registerAiRoutes(app: FastifyInstance, ctx: EngineContext): void {
  app.post("/ai/script", async (req, reply) => {
    if (!ctx.geminiClient) {
      return reply.code(503).send({ error: "Gemini AI is not configured" });
    }
    const parsed = ScriptSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid script request", details: parsed.error.flatten() });
    }
    const script = await ctx.geminiClient.generateScript(parsed.data);
    return { script };
  });

  app.post("/ai/voice", async (req, reply) => {
    if (!ctx.geminiClient) {
      return reply.code(503).send({ error: "Gemini AI is not configured" });
    }
    const parsed = VoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid voice request", details: parsed.error.flatten() });
    }

    const assetId = crypto.randomUUID();
    const now = new Date();
    ctx.db.db
      .insert(assets)
      .values({
        id: assetId,
        kind: "VOICE",
        path: `voices/${assetId}.wav`,
        origName: `ai-voice-${assetId.slice(0, 6)}.wav`,
        status: "PENDING",
        createdAt: now,
      })
      .run();

    const jobId = ctx.jobRunner.enqueue("VOICEOVER", {
      assetId,
      script: parsed.data.script,
      voiceId: parsed.data.voiceId,
    });

    return reply.code(202).send({ jobId, assetId });
  });
}

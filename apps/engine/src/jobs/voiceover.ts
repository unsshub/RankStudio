import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import type { AiScriptRequest } from "@rankstudio/shared";
import { assets } from "../db/schema.js";
import type { DbContext } from "../db/client.js";
import type { SseHub } from "../lib/sse.js";
import { probeMedia } from "../lib/ffprobe.js";

export interface GeminiClient {
  generateScript(req: AiScriptRequest): Promise<string>;
  synthesizeSpeechPcm(script: string, voiceId: string): Promise<{
    pcm: Buffer;
    sampleRate: number;
  }>;
}

export function createGeminiClient(apiKey: string): GeminiClient | null {
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateScript(req: AiScriptRequest): Promise<string> {
      const lengthGuide =
        req.length === "short"
          ? "1-2 punchy sentences (under 30 words)"
          : req.length === "medium"
            ? "3-4 engaging sentences (40-70 words)"
            : "5-7 detailed sentences (80-120 words)";

      const prompt = [
        `Write a spoken voiceover script for a short-form 9:16 Video Ranking clip.`,
        `Topic: ${req.topic}`,
        `Tone: ${req.tone}`,
        `Target length: ${lengthGuide}`,
        req.hook ? `Hook to include: ${req.hook}` : "",
        req.cta ? `Call to action: ${req.cta}` : "",
        `Return ONLY the plain spoken script text without stage directions or markdown.`,
      ]
        .filter(Boolean)
        .join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return (response.text ?? "").trim();
    },

    async synthesizeSpeechPcm(
      script: string,
      voiceId: string
    ): Promise<{ pcm: Buffer; sampleRate: number }> {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceId || "Kore",
              },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("Gemini TTS returned no audio data");
      }
      return {
        pcm: Buffer.from(base64Audio, "base64"),
        sampleRate: 24000,
      };
    },
  };
}

export function pcm16ToWav(pcm: Buffer, sampleRate = 24000, channels = 1): Buffer {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function runVoiceoverJob(
  payload: { assetId: string; script: string; voiceId: string },
  opts: {
    dataDir: string;
    dbCtx: DbContext;
    sse: SseHub;
    geminiClient: GeminiClient | null;
  }
): Promise<void> {
  const { dataDir, dbCtx, sse, geminiClient } = opts;
  if (!geminiClient) {
    throw new Error("Gemini API key is not configured");
  }

  const { pcm, sampleRate } = await geminiClient.synthesizeSpeechPcm(
    payload.script,
    payload.voiceId
  );
  const wav = pcm16ToWav(pcm, sampleRate, 1);

  const voicesDir = path.join(dataDir, "voices");
  fs.mkdirSync(voicesDir, { recursive: true });
  const wavFullPath = path.join(voicesDir, `${payload.assetId}.wav`);
  fs.writeFileSync(wavFullPath, wav);

  let durationSec = pcm.length / (sampleRate * 2);
  try {
    const probed = await probeMedia(wavFullPath);
    if (probed.durationSec > 0) {
      durationSec = probed.durationSec;
    }
  } catch {
    // keep PCM-computed duration
  }

  const relPath = path.relative(dataDir, wavFullPath).replace(/\\/g, "/");
  dbCtx.db
    .update(assets)
    .set({
      path: relPath,
      durationSec,
      status: "READY",
      error: null,
    })
    .where(eq(assets.id, payload.assetId))
    .run();

  sse.emit({
    type: "asset.status",
    assetId: payload.assetId,
    status: "READY",
    durationSec,
  });
}

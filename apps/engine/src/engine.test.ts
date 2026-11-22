import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ENGINE_TOKEN_HEADER } from "@rankstudio/shared";
import { loadConfig } from "./config.js";
import { createServer, type EngineServer } from "./server.js";
import { safeResolve } from "./lib/paths.js";
import { prettifyName } from "./lib/prettifyName.js";
import type { GeminiClient } from "./jobs/voiceover.js";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("Engine HTTP/SSE boundary", () => {
  let tmpRoot: string;
  let dataDir: string;
  let sfxDir: string;
  let server: EngineServer;
  let baseUrl: string;

  beforeEach(async () => {
    tmpRoot = makeTempDir("rankstudio-engine-test-");
    dataDir = path.join(tmpRoot, "data");
    sfxDir = path.join(tmpRoot, "sfx");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(sfxDir, { recursive: true });

    const config = loadConfig({
      DATA_DIR: dataDir,
      SFX_DIR: sfxDir,
      ALLOWED_ORIGINS: "http://localhost:5173,https://example.github.io",
      GEMINI_API_KEY: "",
    });
    server = await createServer({
      config,
      startJobRunner: false,
      serveWebDist: false,
    });
    baseUrl = await server.app.listen({ host: "127.0.0.1", port: 0 });
  });

  afterEach(async () => {
    await server.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("enforces pairing token on API routes while leaving /health public", async () => {
    const hUnpaired = await fetch(`${baseUrl}/health`);
    expect(hUnpaired.status).toBe(200);
    expect(await hUnpaired.json()).toMatchObject({ ok: true, paired: false, gemini: false });

    const hPaired = await fetch(`${baseUrl}/health`, {
      headers: { [ENGINE_TOKEN_HEADER]: server.ctx.token },
    });
    expect(hPaired.status).toBe(200);
    expect(await hPaired.json()).toMatchObject({ ok: true, paired: true });

    const unauth = await fetch(`${baseUrl}/projects`);
    expect(unauth.status).toBe(401);

    const wrong = await fetch(`${baseUrl}/projects`, {
      headers: { [ENGINE_TOKEN_HEADER]: "wrong-token" },
    });
    expect(wrong.status).toBe(401);

    const ok = await fetch(`${baseUrl}/projects`, {
      headers: { [ENGINE_TOKEN_HEADER]: server.ctx.token },
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual([]);
  });

  it("rejects unknown CORS origins and sets Private Network Access header on preflights", async () => {
    const bad = await fetch(`${baseUrl}/health`, {
      headers: { origin: "https://evil.example.com" },
    });
    expect(bad.status).toBe(403);

    const preflight = await fetch(`${baseUrl}/projects`, {
      method: "OPTIONS",
      headers: {
        origin: "https://example.github.io",
        "access-control-request-method": "POST",
        "access-control-request-private-network": "true",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(
      "https://example.github.io"
    );
    expect(preflight.headers.get("access-control-allow-private-network")).toBe("true");
  });

  it("blocks ../ traversal and symlink escapes in safeResolve and /files/*", async () => {
    const outsideFile = path.join(tmpRoot, "secret.txt");
    fs.writeFileSync(outsideFile, "top-secret");

    const validFile = path.join(dataDir, "hello.txt");
    fs.writeFileSync(validFile, "0123456789abcdef");

    const symlinkPath = path.join(dataDir, "escape-link.txt");
    fs.symlinkSync(outsideFile, symlinkPath);

    expect(safeResolve([dataDir, sfxDir], "../secret.txt")).toBeNull();
    expect(safeResolve([dataDir, sfxDir], "escape-link.txt")).toBeNull();
    expect(safeResolve([dataDir, sfxDir], "hello.txt")).toBe(fs.realpathSync(validFile));

    const travRes = await fetch(`${baseUrl}/files/..%2Fsecret.txt?t=${server.ctx.token}`);
    expect(travRes.status).toBe(404);

    const linkRes = await fetch(`${baseUrl}/files/escape-link.txt?t=${server.ctx.token}`);
    expect(linkRes.status).toBe(404);

    // HTTP Range 206 check
    const rangeRes = await fetch(`${baseUrl}/files/hello.txt?t=${server.ctx.token}`, {
      headers: { range: "bytes=2-5" },
    });
    expect(rangeRes.status).toBe(206);
    expect(rangeRes.headers.get("content-range")).toBe("bytes 2-5/16");
    expect(await rangeRes.text()).toBe("2345");
  });

  it("prettifies real SFX filenames and indexes SFX_DIR via /sfx", async () => {
    expect(prettifyName("suspicious_kPZ01VF.mp3")).toBe("Suspicious");
    expect(prettifyName("metal-gear-alert-sound-effect_XKoHReZ.mp3")).toBe(
      "Metal Gear Alert Sound Effect"
    );
    expect(prettifyName("Huh - QuickSounds.com.mp3")).toBe("Huh");
    expect(prettifyName("faaahhh_771BFVE.mp3")).toBe("Faaahhh");

    fs.writeFileSync(path.join(sfxDir, "suspicious_kPZ01VF.mp3"), Buffer.from("ID3"));
    fs.writeFileSync(path.join(sfxDir, "Huh - QuickSounds.com.mp3"), Buffer.from("ID3"));

    const res = await fetch(`${baseUrl}/sfx?q=susp`, {
      headers: { [ENGINE_TOKEN_HEADER]: server.ctx.token },
    });
    expect(res.status).toBe(200);
    const items = (await res.json()) as Array<{ name: string; category: string }>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Suspicious",
      category: "My Sounds",
    });
  });

  it("claims queued jobs atomically and recovers interrupted RUNNING jobs on boot", () => {
    const j1 = server.ctx.jobRunner.enqueue("INGEST", { assetId: "a1" });
    const j2 = server.ctx.jobRunner.enqueue("INGEST", { assetId: "a2" });

    const c1 = server.ctx.jobRunner.claimNext("INGEST");
    const c2 = server.ctx.jobRunner.claimNext("INGEST");
    const c3 = server.ctx.jobRunner.claimNext("INGEST");

    expect(c1?.id).toBe(j1);
    expect(c2?.id).toBe(j2);
    expect(c3).toBeNull();

    const recovered = server.ctx.jobRunner.recoverInterruptedJobs();
    expect(recovered).toBe(2);
  });

  it("supports project CRUD, template duplication, and delete cleanup", async () => {
    const createRes = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ENGINE_TOKEN_HEADER]: server.ctx.token,
      },
      body: JSON.stringify({ name: "My Ranking" }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as any;

    // Mutate clip 1 to have media & voiceover, then duplicate as template
    created.data.clips[0].media.assetId = "vid-1";
    created.data.clips[0].trim = { startSec: 1, endSec: 5 };
    created.data.clips[0].voiceover.audioAssetId = "voice-1";

    const patchRes = await fetch(`${baseUrl}/projects/${created.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        [ENGINE_TOKEN_HEADER]: server.ctx.token,
      },
      body: JSON.stringify({ data: created.data }),
    });
    expect(patchRes.status).toBe(200);

    const dupRes = await fetch(`${baseUrl}/projects/${created.id}/duplicate?template=1`, {
      method: "POST",
      headers: { [ENGINE_TOKEN_HEADER]: server.ctx.token },
    });
    expect(dupRes.status).toBe(201);
    const dup = (await dupRes.json()) as any;
    expect(dup.data.clips[0].media.assetId).toBeNull();
    expect(dup.data.clips[0].voiceover.audioAssetId).toBeNull();
    expect(dup.data.clips[0].trim).toEqual({ startSec: 0, endSec: 3 });

    // Create a dummy render dir and confirm DELETE removes it
    const renderDir = path.join(dataDir, "renders", created.id);
    fs.mkdirSync(renderDir, { recursive: true });
    fs.writeFileSync(path.join(renderDir, "output.mp4"), "fake");

    const delRes = await fetch(`${baseUrl}/projects/${created.id}`, {
      method: "DELETE",
      headers: { [ENGINE_TOKEN_HEADER]: server.ctx.token },
    });
    expect(delRes.status).toBe(204);
    expect(fs.existsSync(renderDir)).toBe(false);
  });

  it("gates Gemini AI routes when unconfigured and runs stubbed AI script + TTS job when configured", async () => {
    const unavail = await fetch(`${baseUrl}/ai/script`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ENGINE_TOKEN_HEADER]: server.ctx.token,
      },
      body: JSON.stringify({
        topic: "Cats",
        tone: "funny",
        length: "short",
        hook: "",
        cta: "",
      }),
    });
    expect(unavail.status).toBe(503);

    const stubGemini: GeminiClient = {
      async generateScript(req) {
        return `Generated script about ${req.topic}`;
      },
      async synthesizeSpeechPcm() {
        return { pcm: Buffer.alloc(24000 * 2 * 0.25), sampleRate: 24000 };
      },
    };

    const aiDataDir = path.join(tmpRoot, "ai-data");
    const aiServer = await createServer({
      config: loadConfig({ DATA_DIR: aiDataDir, SFX_DIR: sfxDir }),
      geminiClient: stubGemini,
      startJobRunner: true,
      serveWebDist: false,
    });
    const aiUrl = await aiServer.app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const health = (await (await fetch(`${aiUrl}/health`)).json()) as { gemini: boolean };
      expect(health.gemini).toBe(true);

      const scriptRes = await fetch(`${aiUrl}/ai/script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [ENGINE_TOKEN_HEADER]: aiServer.ctx.token,
        },
        body: JSON.stringify({
          topic: "Rockets",
          tone: "hype",
          length: "short",
          hook: "",
          cta: "",
        }),
      });
      expect(scriptRes.status).toBe(200);
      expect(((await scriptRes.json()) as { script: string }).script).toBe(
        "Generated script about Rockets"
      );

      const voiceRes = await fetch(`${aiUrl}/ai/voice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [ENGINE_TOKEN_HEADER]: aiServer.ctx.token,
        },
        body: JSON.stringify({ script: "Hello world", voiceId: "Kore" }),
      });
      expect(voiceRes.status).toBe(202);
      const { assetId } = (await voiceRes.json()) as { assetId: string };

      let status = "PENDING";
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const aRes = await fetch(`${aiUrl}/assets/${assetId}`, {
          headers: { [ENGINE_TOKEN_HEADER]: aiServer.ctx.token },
        });
        status = ((await aRes.json()) as { status: string }).status;
        if (status === "READY") break;
      }
      expect(status).toBe("READY");
      expect(fs.existsSync(path.join(aiDataDir, "voices", `${assetId}.wav`))).toBe(true);
    } finally {
      await aiServer.close();
    }
  });
});

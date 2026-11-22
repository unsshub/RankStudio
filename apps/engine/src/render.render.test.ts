import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { renderStill, selectComposition } from "@remotion/renderer";
import {
  computeDurationSec,
  defaultClip,
  defaultProject,
} from "@rankstudio/composition";
import { ENGINE_TOKEN_HEADER } from "@rankstudio/shared";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { getCompositionBundle } from "./jobs/render.js";
import { probeMedia, runFfmpeg } from "./lib/ffprobe.js";

describe("Remotion renderStill & 3-clip MP4 integration", () => {
  it("renders golden still frames (start, mid-clip, transition, end) and a valid 1080x1920 30fps H.264/AAC MP4", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rankstudio-render-test-"));
    const dataDir = path.join(tmpRoot, "data");
    const sfxDir = path.join(tmpRoot, "sfx");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(sfxDir, { recursive: true });

    const port = 4191;
    const config = loadConfig({
      ENGINE_HOST: "127.0.0.1",
      ENGINE_PORT: String(port),
      DATA_DIR: dataDir,
      SFX_DIR: sfxDir,
      ALLOWED_ORIGINS: `http://127.0.0.1:${port},http://localhost:5173`,
    });

    const server = await createServer({
      config,
      startJobRunner: true,
      serveWebDist: false,
    });
    await server.app.listen({ host: "127.0.0.1", port });

    try {
      // Create 3 short fixture MP4 clips via ffmpeg
      const assetIds: string[] = [];
      const colors = ["red", "green", "blue"];
      for (let i = 0; i < 3; i++) {
        const assetId = `fixture-${i + 1}`;
        const mediaDir = path.join(dataDir, "media", assetId);
        fs.mkdirSync(mediaDir, { recursive: true });
        const mp4Path = path.join(mediaDir, "source.mp4");
        await runFfmpeg([
          "-f",
          "lavfi",
          "-i",
          `color=c=${colors[i]}:s=360x640:d=2:r=30`,
          "-f",
          "lavfi",
          "-i",
          "anullsrc=r=44100:cl=stereo",
          "-t",
          "2",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          mp4Path,
        ]);

        server.ctx.db.sqlite
          .prepare(
            `INSERT INTO assets (id, kind, path, orig_name, duration_sec, width, height, status, created_at)
             VALUES (?, 'VIDEO', ?, ?, 2, 360, 640, 'READY', ?)`
          )
          .run(assetId, `media/${assetId}/source.mp4`, `clip${i + 1}.mp4`, Date.now());
        assetIds.push(assetId);
      }

      const project = defaultProject();
      project.clips = assetIds.map((assetId, idx) => {
        const c = defaultClip(idx + 1, `c-${idx + 1}`);
        c.media = { assetId, durationSec: 2, width: 360, height: 640 };
        c.trim = { startSec: 0, endSec: 1.5 };
        c.animation.transition = idx > 0 ? "fade" : "none";
        return c;
      });
      project.playback = {
        custom: false,
        mode: "manual",
        order: project.clips.map((c) => c.id).reverse(),
        seed: 1,
      };

      const baseUrl = `http://127.0.0.1:${port}`;
      const createRes = await fetch(`${baseUrl}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [ENGINE_TOKEN_HEADER]: server.ctx.token,
        },
        body: JSON.stringify({ name: "Render Test", data: project }),
      });
      const created = (await createRes.json()) as any;

      // 1. renderStill at frame 0, mid-clip, transition, end
      const serveUrl = await getCompositionBundle();
      const assetPaths = Object.fromEntries(
        assetIds.map((id) => [id, `media/${id}/source.mp4`])
      );
      const inputProps = {
        project,
        engineUrl: `http://127.0.0.1:${port}`,
        token: server.ctx.token,
        assetPaths,
        voiceDurations: {},
        sfxPaths: {},
      };
      const comp = await selectComposition({
        serveUrl,
        id: "RankingVideo",
        inputProps,
      });

      const keyFrames = [
        0,
        Math.floor(comp.durationInFrames / 3),
        Math.floor(comp.durationInFrames / 2),
        comp.durationInFrames - 1,
      ];
      for (const frame of keyFrames) {
        const outPng = path.join(tmpRoot, `still-${frame}.png`);
        await renderStill({
          composition: comp,
          serveUrl,
          frame,
          output: outPng,
          imageFormat: "png",
          inputProps,
        });
        expect(fs.statSync(outPng).size).toBeGreaterThan(1000);
      }

      // 2. Queue full MP4 render through HTTP seam and verify via ffprobe
      const renderRes = await fetch(`${baseUrl}/projects/${created.id}/render`, {
        method: "POST",
        headers: { [ENGINE_TOKEN_HEADER]: server.ctx.token },
      });
      expect(renderRes.status).toBe(202);

      let finalProject = created;
      for (let i = 0; i < 180; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const pRes = await fetch(`${baseUrl}/projects/${created.id}`, {
          headers: { [ENGINE_TOKEN_HEADER]: server.ctx.token },
        });
        finalProject = (await pRes.json()) as any;
        if (finalProject.status === "COMPLETED" || finalProject.status === "FAILED") {
          break;
        }
      }

      expect(finalProject.status).toBe("COMPLETED");
      const mp4Full = path.join(dataDir, finalProject.outputPath);
      const thumbFull = path.join(dataDir, finalProject.thumbPath);
      expect(fs.existsSync(mp4Full)).toBe(true);
      expect(fs.existsSync(thumbFull)).toBe(true);

      const probed = await probeMedia(mp4Full);
      expect(probed.width).toBe(1080);
      expect(probed.height).toBe(1920);
      expect(probed.videoCodec).toBe("h264");
      expect(probed.audioCodec).toBe("aac");
      expect(probed.fps).toBeCloseTo(30, 1);

      const expectedDuration = computeDurationSec(project);
      expect(Math.abs(probed.durationSec - expectedDuration)).toBeLessThanOrEqual(0.25);
    } finally {
      await server.close();
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }, 120000);
});

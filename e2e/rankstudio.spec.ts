import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { test, expect } from "@playwright/test";

function createFixtureVideo(outPath: string, color: string) {
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=360x640:d=2:r=30`,
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
    outPath,
  ]);
}

function createFixtureAudio(outPath: string) {
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=0.6",
    "-c:a",
    "libmp3lame",
    outPath,
  ]);
}

async function waitForUrl(url: string, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

test("full RankStudio flow: pair, upload 4 clips, SFX, generate, library & download", async ({
  page,
}) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rankstudio-e2e-"));
  const dataDir = path.join(tmpRoot, "data");
  const sfxDir = path.join(tmpRoot, "sfx");
  const fixtureDir = path.join(tmpRoot, "fixtures");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(sfxDir, { recursive: true });
  fs.mkdirSync(fixtureDir, { recursive: true });

  // Create 4 fixture MP4s and 1 fixture SFX ("Suspicious")
  const clips = ["red", "green", "blue", "yellow"].map((c, idx) => {
    const p = path.join(fixtureDir, `clip-${idx + 1}.mp4`);
    createFixtureVideo(p, c);
    return p;
  });
  createFixtureAudio(path.join(sfxDir, "suspicious_kPZ01VF.mp3"));

  const enginePort = 4199;
  const engineUrl = `http://127.0.0.1:${enginePort}`;
  const webUrl = "http://localhost:5173/RankStudio/";

  const engineProc: ChildProcess = spawn("npx", ["tsx", "apps/engine/src/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ENGINE_HOST: "127.0.0.1",
      ENGINE_PORT: String(enginePort),
      DATA_DIR: dataDir,
      SFX_DIR: sfxDir,
      ALLOWED_ORIGINS: `http://localhost:5173,${engineUrl}`,
    },
    stdio: "pipe",
  });

  const webProc: ChildProcess = spawn("npm", ["-w", "apps/web", "run", "dev"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_DEFAULT_ENGINE_URL: engineUrl,
    },
    stdio: "pipe",
  });

  try {
    await waitForUrl(`${engineUrl}/health`);
    await waitForUrl(webUrl);

    const token = fs.readFileSync(path.join(dataDir, "token.txt"), "utf8").trim();

    await page.goto(webUrl);
    // Pair browser
    await page.getByLabel("Pairing token").fill(token);
    await page.getByRole("button", { name: "Pair Browser" }).click();
    await expect(page.getByText("Welcome to RankStudio")).toBeVisible();

    // Start new Video Ranking project
    await page.getByRole("link", { name: /New Video Ranking/i }).click();
    await expect(page.getByText("Rank Slots (3)")).toBeVisible();

    // Add 4th clip
    await page.getByRole("button", { name: /Add More Video/i }).click();
    await expect(page.getByText("Rank Slots (4)")).toBeVisible();

    // Upload 4 clips
    for (let rank = 1; rank <= 4; rank++) {
      await page.getByRole("button", { name: new RegExp(`#${rank}`) }).first().click();
      await page.getByTestId(`clip-upload-input-${rank}`).setInputFiles(clips[rank - 1]);
      await expect(page.getByText("READY").nth(rank - 1)).toBeVisible({ timeout: 25000 });
    }

    // Pick "Suspicious" SFX on clip #4
    await page.getByRole("button", { name: "Sound Effect" }).click();
    await page.getByRole("button", { name: /Suspicious/i }).click();

    // Generate Video Ranking
    await page.getByRole("button", { name: /Generate Video Ranking/i }).click();
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

    // Wait for COMPLETED card
    await expect(page.getByText(/COMPLETED/i)).toBeVisible({ timeout: 120000 });

    // Verify download endpoint returns valid MP4
    const projRes = await fetch(`${engineUrl}/projects`, {
      headers: { "X-RankStudio-Token": token },
    });
    const list = (await projRes.json()) as Array<{ id: string }>;
    const dlRes = await fetch(
      `${engineUrl}/renders/${list[0].id}/download?t=${encodeURIComponent(token)}`
    );
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get("content-type")).toBe("video/mp4");
    const buf = Buffer.from(await dlRes.arrayBuffer());
    expect(buf.length).toBeGreaterThan(5000);
  } finally {
    engineProc.kill("SIGTERM");
    webProc.kill("SIGTERM");
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

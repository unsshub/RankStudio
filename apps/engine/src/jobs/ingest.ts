import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { assets } from "../db/schema.js";
import type { DbContext } from "../db/client.js";
import type { SseHub } from "../lib/sse.js";
import { probeMedia, runFfmpeg, runFfmpegRawBuffer } from "../lib/ffprobe.js";

function computePeaks(pcm: Buffer, targetBars = 400): number[] {
  const sampleCount = Math.floor(pcm.length / 2);
  if (sampleCount === 0) {
    return new Array(targetBars).fill(0);
  }
  const blockSize = Math.max(1, Math.floor(sampleCount / targetBars));
  const peaks: number[] = [];
  for (let i = 0; i < targetBars; i++) {
    const start = i * blockSize;
    const end = Math.min(sampleCount, start + blockSize);
    let maxVal = 0;
    for (let s = start; s < end; s++) {
      const sample = Math.abs(pcm.readInt16LE(s * 2));
      if (sample > maxVal) maxVal = sample;
    }
    peaks.push(Math.round((maxVal / 32768) * 1000) / 1000);
  }
  return peaks;
}

export async function runIngestJob(
  assetId: string,
  dataDir: string,
  dbCtx: DbContext,
  sse: SseHub
): Promise<void> {
  const [asset] = dbCtx.db.select().from(assets).where(eq(assets.id, assetId)).all();
  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  const sourceFullPath = path.join(dataDir, asset.path);
  if (!fs.existsSync(sourceFullPath)) {
    throw new Error(`Source file missing for asset ${assetId}`);
  }

  const probe = await probeMedia(sourceFullPath);

  if (asset.kind === "VOICE" || asset.kind === "SFX_UPLOAD") {
    dbCtx.db
      .update(assets)
      .set({
        durationSec: probe.durationSec,
        status: "READY",
        error: null,
      })
      .where(eq(assets.id, assetId))
      .run();

    sse.emit({
      type: "asset.status",
      assetId,
      status: "READY",
      durationSec: probe.durationSec,
    });
    return;
  }

  // VIDEO ingest
  const assetDir = path.dirname(sourceFullPath);
  let playbackRelPath = asset.path;

  const isBrowserSafe =
    probe.videoCodec === "h264" &&
    probe.pixFmt === "yuv420p" &&
    (probe.audioCodec === null || probe.audioCodec === "aac") &&
    path.extname(sourceFullPath).toLowerCase() === ".mp4";

  if (!isBrowserSafe) {
    const proxyFullPath = path.join(assetDir, "proxy.mp4");
    await runFfmpeg([
      "-i",
      sourceFullPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      proxyFullPath,
    ]);
    playbackRelPath = path.relative(dataDir, proxyFullPath).replace(/\\/g, "/");
  }

  // Filmstrip sprite: 1 fps, height 90px, tiled Nx1
  const tileCount = Math.max(1, Math.min(120, Math.ceil(probe.durationSec || 1)));
  const filmstripFullPath = path.join(assetDir, "filmstrip.jpg");
  let filmstripRel: string | null = null;
  try {
    await runFfmpeg([
      "-i",
      path.join(dataDir, playbackRelPath),
      "-vf",
      `fps=1,scale=-1:90,tile=${tileCount}x1`,
      "-frames:v",
      "1",
      "-q:v",
      "4",
      filmstripFullPath,
    ]);
    if (fs.existsSync(filmstripFullPath)) {
      filmstripRel = path.relative(dataDir, filmstripFullPath).replace(/\\/g, "/");
    }
  } catch {
    filmstripRel = null;
  }

  // Waveform: mono 8kHz s16le -> 400 peaks JSON
  const waveformFullPath = path.join(assetDir, "waveform.json");
  let waveformRel: string | null = null;
  try {
    const pcm = await runFfmpegRawBuffer([
      "-i",
      path.join(dataDir, playbackRelPath),
      "-vn",
      "-ac",
      "1",
      "-ar",
      "8000",
      "-f",
      "s16le",
      "pipe:1",
    ]);
    const peaks = computePeaks(pcm, 400);
    fs.writeFileSync(waveformFullPath, JSON.stringify({ peaks }));
    waveformRel = path.relative(dataDir, waveformFullPath).replace(/\\/g, "/");
  } catch {
    // Video may have no audio track; write flat peaks
    fs.writeFileSync(waveformFullPath, JSON.stringify({ peaks: new Array(400).fill(0) }));
    waveformRel = path.relative(dataDir, waveformFullPath).replace(/\\/g, "/");
  }

  dbCtx.db
    .update(assets)
    .set({
      path: playbackRelPath,
      durationSec: probe.durationSec,
      width: probe.width,
      height: probe.height,
      filmstrip: filmstripRel,
      waveform: waveformRel,
      status: "READY",
      error: null,
    })
    .where(eq(assets.id, assetId))
    .run();

  sse.emit({
    type: "asset.status",
    assetId,
    status: "READY",
    durationSec: probe.durationSec,
    width: probe.width,
    height: probe.height,
    filmstrip: filmstripRel,
    waveform: waveformRel,
  });
}

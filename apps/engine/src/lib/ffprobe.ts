import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  durationSec: number;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  pixFmt: string | null;
  fps: number | null;
}

export async function probeMedia(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-print_format",
    "json",
    filePath,
  ]);

  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      pix_fmt?: string;
      avg_frame_rate?: string;
      duration?: string;
    }>;
  };

  const streams = parsed.streams ?? [];
  const videoStream = streams.find((s) => s.codec_type === "video");
  const audioStream = streams.find((s) => s.codec_type === "audio");

  const durationRaw =
    parsed.format?.duration ?? videoStream?.duration ?? audioStream?.duration ?? "0";
  const durationSec = Math.max(0, parseFloat(durationRaw) || 0);

  let fps: number | null = null;
  if (videoStream?.avg_frame_rate && videoStream.avg_frame_rate.includes("/")) {
    const [num, den] = videoStream.avg_frame_rate.split("/").map(Number);
    if (den > 0 && Number.isFinite(num / den)) {
      fps = num / den;
    }
  }

  return {
    durationSec,
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    videoCodec: videoStream?.codec_name ?? null,
    audioCodec: audioStream?.codec_name ?? null,
    pixFmt: videoStream?.pix_fmt ?? null,
    fps,
  };
}

export async function runFfmpeg(args: string[]): Promise<void> {
  await execFileAsync("ffmpeg", ["-y", ...args], {
    maxBuffer: 20 * 1024 * 1024,
  });
}

export async function runFfmpegRawBuffer(args: string[]): Promise<Buffer> {
  const { stdout } = await execFileAsync("ffmpeg", ["-y", ...args], {
    encoding: "buffer",
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout;
}

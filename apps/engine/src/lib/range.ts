import fs from "node:fs";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json",
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export function streamWithRange(
  req: FastifyRequest,
  reply: FastifyReply,
  filePath: string
) {
  const stat = fs.statSync(filePath);
  const totalSize = stat.size;
  const contentType = getMimeType(filePath);
  const rangeHeader = req.headers.range;

  reply.header("Accept-Ranges", "bytes");
  reply.header("Content-Type", contentType);
  reply.header("Cache-Control", "private, max-age=3600");

  if (!rangeHeader) {
    reply.header("Content-Length", totalSize);
    return reply.code(200).send(fs.createReadStream(filePath));
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    reply.header("Content-Range", `bytes */${totalSize}`);
    return reply.code(416).send();
  }

  let start = match[1] ? parseInt(match[1], 10) : 0;
  let end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

  if (!match[1] && match[2]) {
    const suffix = parseInt(match[2], 10);
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  }

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start > end ||
    start >= totalSize
  ) {
    reply.header("Content-Range", `bytes */${totalSize}`);
    return reply.code(416).send();
  }

  end = Math.min(end, totalSize - 1);
  const chunkSize = end - start + 1;

  reply.code(206);
  reply.header("Content-Range", `bytes ${start}-${end}/${totalSize}`);
  reply.header("Content-Length", chunkSize);
  return reply.send(fs.createReadStream(filePath, { start, end }));
}

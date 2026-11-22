import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function loadOrCreateToken(dataDir: string): string {
  fs.mkdirSync(dataDir, { recursive: true });
  const tokenPath = path.join(dataDir, "token.txt");
  if (fs.existsSync(tokenPath)) {
    const existing = fs.readFileSync(tokenPath, "utf8").trim();
    if (existing.length >= 16) {
      return existing;
    }
  }
  const token = crypto.randomBytes(32).toString("base64url");
  fs.writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });
  return token;
}

export function verifyToken(candidate: string | undefined, expected: string): boolean {
  if (!candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildPairingLink(pagesUrl: string, token: string): string {
  const base = pagesUrl
    ? pagesUrl.replace(/\/$/, "")
    : "http://127.0.0.1:4000";
  return `${base}/#/settings?token=${encodeURIComponent(token)}`;
}

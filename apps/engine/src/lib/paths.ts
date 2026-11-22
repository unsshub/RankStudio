import fs from "node:fs";
import path from "node:path";

/**
 * Resolves a relative path against one or more allowed root directories,
 * following symlinks via realpathSync and rejecting any escape outside the roots.
 */
export function safeResolve(roots: string[], unsafeRelPath: string): string | null {
  if (!unsafeRelPath || unsafeRelPath.includes("\0")) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(unsafeRelPath);
  } catch {
    return null;
  }

  const normalizedRel = decoded.replace(/^\/+/, "");
  if (!normalizedRel) return null;

  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    const realRoot = fs.realpathSync(root);
    const candidate = path.resolve(realRoot, normalizedRel);

    if (candidate !== realRoot && !candidate.startsWith(realRoot + path.sep)) {
      continue;
    }

    if (!fs.existsSync(candidate)) {
      continue;
    }

    const realCandidate = fs.realpathSync(candidate);
    if (
      realCandidate === realRoot ||
      realCandidate.startsWith(realRoot + path.sep)
    ) {
      const stat = fs.statSync(realCandidate);
      if (stat.isFile()) {
        return realCandidate;
      }
    }
  }

  return null;
}

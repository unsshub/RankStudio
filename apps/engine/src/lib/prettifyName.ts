import path from "node:path";

/**
 * Cleans up an SFX filename for display:
 * - strips extension
 * - strips " - QuickSounds.com"
 * - strips trailing "_XXXXXXX" (6-8 alphanumeric random suffix)
 * - replaces "-" and "_" with spaces
 * - title-cases words
 */
export function prettifyName(filename: string): string {
  const base = path.basename(filename);
  let name = base.replace(/\.[^.]+$/, "");
  name = name.replace(/\s*-\s*QuickSounds\.com$/i, "");
  name = name.replace(/_[A-Za-z0-9]{6,8}$/, "");
  name = name.replace(/[-_]+/g, " ").trim();
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SfxItem } from "@rankstudio/shared";
import { ALLOWED_AUDIO_EXTENSIONS } from "@rankstudio/shared";
import { probeMedia } from "./ffprobe.js";
import { prettifyName } from "./prettifyName.js";

interface CacheEntry {
  mtimeMs: number;
  durationSec: number;
}

export class SfxIndex {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private sfxDir: string,
    private dataDir: string
  ) {}

  private hashId(relPath: string): string {
    return crypto.createHash("sha1").update(relPath).digest("hex").slice(0, 12);
  }

  private async scanFolder(
    dir: string,
    prefix: string,
    category: string
  ): Promise<SfxItem[]> {
    if (!dir || !fs.existsSync(dir)) {
      return [];
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const items: SfxItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!(ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(ext)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const stat = fs.statSync(fullPath);
      const cached = this.cache.get(fullPath);
      let durationSec = 0;

      if (cached && cached.mtimeMs === stat.mtimeMs) {
        durationSec = cached.durationSec;
      } else {
        try {
          const probed = await probeMedia(fullPath);
          durationSec = probed.durationSec;
        } catch {
          durationSec = 0;
        }
        this.cache.set(fullPath, { mtimeMs: stat.mtimeMs, durationSec });
      }

      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const id = this.hashId(relPath);
      items.push({
        id,
        name: prettifyName(entry.name),
        category,
        durationSec: Math.round(durationSec * 100) / 100,
        path: relPath,
        url: `/files/${relPath.split("/").map(encodeURIComponent).join("/")}`,
      });
    }

    return items;
  }

  async list(query?: string): Promise<SfxItem[]> {
    const [folderItems, uploadedItems] = await Promise.all([
      this.scanFolder(this.sfxDir, "", "My Sounds"),
      this.scanFolder(path.join(this.dataDir, "sfx-uploads"), "sfx-uploads", "Uploaded"),
    ]);

    const all = [...folderItems, ...uploadedItems].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    if (!query || !query.trim()) {
      return all;
    }

    const q = query.trim().toLowerCase();
    return all.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }

  async getMapById(): Promise<Record<string, string>> {
    const items = await this.list();
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.id] = item.path;
    }
    return map;
  }
}

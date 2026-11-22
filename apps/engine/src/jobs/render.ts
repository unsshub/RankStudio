import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { bundle } from "@remotion/bundler";
import {
  makeCancelSignal,
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { migrate, type RankingProject } from "@rankstudio/composition";
import { assets, projects } from "../db/schema.js";
import type { DbContext } from "../db/client.js";
import type { SseHub } from "../lib/sse.js";
import type { SfxIndex } from "../lib/sfxIndex.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedBundleLocation: string | null = null;
let bundlingPromise: Promise<string> | null = null;

export function resolveCompositionEntryPoint(): string {
  const candidates = [
    path.resolve(__dirname, "../../../../packages/composition/src/Root.tsx"),
    path.resolve(process.cwd(), "packages/composition/src/Root.tsx"),
    path.resolve(process.cwd(), "../../packages/composition/src/Root.tsx"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("Could not locate packages/composition/src/Root.tsx");
}

export async function getCompositionBundle(): Promise<string> {
  if (cachedBundleLocation) return cachedBundleLocation;
  if (!bundlingPromise) {
    const entryPoint = resolveCompositionEntryPoint();
    bundlingPromise = bundle({
      entryPoint,
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          extensionAlias: {
            ".js": [".ts", ".tsx", ".js"],
            ".jsx": [".tsx", ".jsx"],
          },
        },
      }),
    }).then((loc) => {
      cachedBundleLocation = loc;
      return loc;
    });
  }
  return bundlingPromise;
}

export interface ActiveRenderHandle {
  cancel: () => void;
}

export async function runRenderJob(
  projectId: string,
  opts: {
    dataDir: string;
    engineUrl: string;
    token: string;
    dbCtx: DbContext;
    sse: SseHub;
    sfxIndex: SfxIndex;
    registerCancel: (projectId: string, handle: ActiveRenderHandle) => void;
    clearCancel: (projectId: string) => void;
  }
): Promise<void> {
  const { dataDir, engineUrl, token, dbCtx, sse, sfxIndex, registerCancel, clearCancel } =
    opts;

  const [row] = dbCtx.db.select().from(projects).where(eq(projects.id, projectId)).all();
  if (!row) {
    throw new Error(`Project ${projectId} not found`);
  }

  const project: RankingProject = migrate(row.data);

  // Build asset path and voice duration maps
  const allAssets = dbCtx.db.select().from(assets).all();
  const assetPaths: Record<string, string> = {};
  const voiceDurations: Record<string, number> = {};
  for (const a of allAssets) {
    assetPaths[a.id] = a.path;
    if (a.kind === "VOICE" && typeof a.durationSec === "number") {
      voiceDurations[a.id] = a.durationSec;
    }
  }
  const sfxPaths = await sfxIndex.getMapById();

  const renderDir = path.join(dataDir, "renders", projectId);
  fs.mkdirSync(renderDir, { recursive: true });
  const outputFullPath = path.join(renderDir, "output.mp4");
  const thumbFullPath = path.join(renderDir, "thumb.jpg");

  const { cancelSignal, cancel } = makeCancelSignal();
  registerCancel(projectId, { cancel });

  try {
    const serveUrl = await getCompositionBundle();
    const inputProps = {
      project,
      engineUrl,
      token,
      assetPaths,
      voiceDurations,
      sfxPaths,
    };

    const composition = await selectComposition({
      serveUrl,
      id: "RankingVideo",
      inputProps,
    });

    let lastEmitAt = 0;
    const reportProgress = (progress: number) => {
      const now = Date.now();
      const clamped = Math.max(0, Math.min(1, progress));
      if (now - lastEmitAt < 500 && clamped < 1) return;
      lastEmitAt = now;
      dbCtx.db
        .update(projects)
        .set({ progress: clamped, updatedAt: new Date(now) })
        .where(eq(projects.id, projectId))
        .run();
      sse.emit({
        type: "project.progress",
        projectId,
        progress: clamped,
      });
    };

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputFullPath,
      inputProps,
      cancelSignal,
      onProgress: ({ progress }) => reportProgress(progress),
    });

    const thumbFrame = Math.min(
      Math.max(0, composition.durationInFrames - 1),
      composition.fps
    );
    await renderStill({
      composition,
      serveUrl,
      frame: thumbFrame,
      output: thumbFullPath,
      imageFormat: "jpeg",
      inputProps,
    });

    const outputRel = path.relative(dataDir, outputFullPath).replace(/\\/g, "/");
    const thumbRel = path.relative(dataDir, thumbFullPath).replace(/\\/g, "/");
    const now = new Date();

    dbCtx.db
      .update(projects)
      .set({
        status: "COMPLETED",
        progress: 1,
        outputPath: outputRel,
        thumbPath: thumbRel,
        error: null,
        updatedAt: now,
      })
      .where(eq(projects.id, projectId))
      .run();

    sse.emit({
      type: "project.status",
      projectId,
      status: "COMPLETED",
      progress: 1,
      outputPath: outputRel,
      thumbPath: thumbRel,
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const now = new Date();
    dbCtx.db
      .update(projects)
      .set({
        status: "FAILED",
        error: message,
        updatedAt: now,
      })
      .where(eq(projects.id, projectId))
      .run();

    sse.emit({
      type: "project.status",
      projectId,
      status: "FAILED",
      error: message,
    });
    throw err;
  } finally {
    clearCancel(projectId);
  }
}

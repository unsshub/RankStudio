import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { JobType } from "@rankstudio/shared";
import { assets, jobs } from "../db/schema.js";
import type { DbContext } from "../db/client.js";
import type { SseHub } from "../lib/sse.js";
import type { SfxIndex } from "../lib/sfxIndex.js";
import { runIngestJob } from "./ingest.js";
import { runRenderJob, type ActiveRenderHandle } from "./render.js";
import { runVoiceoverJob, type GeminiClient } from "./voiceover.js";

export interface ClaimedJob {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
}

export class JobRunner {
  private timer: NodeJS.Timeout | null = null;
  private activeIngests = 0;
  private activeRenders = 0;
  private activeVoiceovers = 0;
  private renderHandles = new Map<string, ActiveRenderHandle>();
  private stopped = false;

  constructor(
    private opts: {
      dataDir: string;
      engineUrl: string;
      token: string;
      renderConcurrency: number;
      dbCtx: DbContext;
      sse: SseHub;
      sfxIndex: SfxIndex;
      geminiClient: GeminiClient | null;
    }
  ) {}

  recoverInterruptedJobs(): number {
    const now = Date.now();
    const res = this.opts.dbCtx.sqlite
      .prepare(
        `UPDATE jobs SET status = 'FAILED', error = 'interrupted', updated_at = ? WHERE status = 'RUNNING'`
      )
      .run(now);

    this.opts.dbCtx.sqlite
      .prepare(
        `UPDATE projects SET status = 'FAILED', error = 'interrupted', updated_at = ? WHERE status = 'RENDERING'`
      )
      .run(now);

    return res.changes;
  }

  enqueue(type: JobType, payload: Record<string, unknown>): string {
    const id = crypto.randomUUID();
    const now = new Date();
    this.opts.dbCtx.db
      .insert(jobs)
      .values({
        id,
        type,
        payload,
        status: "QUEUED",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return id;
  }

  /**
   * Atomically claims the oldest QUEUED job of the given type.
   */
  claimNext(type: JobType): ClaimedJob | null {
    const now = Date.now();
    const row = this.opts.dbCtx.sqlite
      .prepare(
        `UPDATE jobs
         SET status = 'RUNNING', attempts = attempts + 1, updated_at = ?
         WHERE id = (
           SELECT id FROM jobs WHERE type = ? AND status = 'QUEUED' ORDER BY created_at ASC LIMIT 1
         ) AND status = 'QUEUED'
         RETURNING id, type, payload`
      )
      .get(now, type) as { id: string; type: JobType; payload: string } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
    };
  }

  cancelRender(projectId: string): boolean {
    const handle = this.renderHandles.get(projectId);
    if (!handle) return false;
    handle.cancel();
    return true;
  }

  start(): void {
    this.stopped = false;
    this.recoverInterruptedJobs();
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, 500);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const handle of this.renderHandles.values()) {
      handle.cancel();
    }
    this.renderHandles.clear();
  }

  private tick(): void {
    if (this.stopped) return;

    while (this.activeIngests < 2) {
      const job = this.claimNext("INGEST");
      if (!job) break;
      this.activeIngests++;
      this.executeJob(job).finally(() => {
        this.activeIngests--;
      });
    }

    while (this.activeRenders < this.opts.renderConcurrency) {
      const job = this.claimNext("RENDER");
      if (!job) break;
      this.activeRenders++;
      this.executeJob(job).finally(() => {
        this.activeRenders--;
      });
    }

    while (this.activeVoiceovers < 2) {
      const job = this.claimNext("VOICEOVER");
      if (!job) break;
      this.activeVoiceovers++;
      this.executeJob(job).finally(() => {
        this.activeVoiceovers--;
      });
    }
  }

  private async executeJob(job: ClaimedJob): Promise<void> {
    try {
      if (job.type === "INGEST") {
        const assetId = String(job.payload.assetId);
        try {
          await runIngestJob(assetId, this.opts.dataDir, this.opts.dbCtx, this.opts.sse);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.opts.dbCtx.db
            .update(assets)
            .set({ status: "FAILED", error: msg })
            .where(eq(assets.id, assetId))
            .run();
          this.opts.sse.emit({
            type: "asset.status",
            assetId,
            status: "FAILED",
            error: msg,
          });
          throw err;
        }
      } else if (job.type === "RENDER") {
        const projectId = String(job.payload.projectId);
        await runRenderJob(projectId, {
          dataDir: this.opts.dataDir,
          engineUrl: this.opts.engineUrl,
          token: this.opts.token,
          dbCtx: this.opts.dbCtx,
          sse: this.opts.sse,
          sfxIndex: this.opts.sfxIndex,
          registerCancel: (pid, handle) => this.renderHandles.set(pid, handle),
          clearCancel: (pid) => this.renderHandles.delete(pid),
        });
      } else if (job.type === "VOICEOVER") {
        const assetId = String(job.payload.assetId);
        try {
          await runVoiceoverJob(
            {
              assetId,
              script: String(job.payload.script ?? ""),
              voiceId: String(job.payload.voiceId ?? "Kore"),
            },
            {
              dataDir: this.opts.dataDir,
              dbCtx: this.opts.dbCtx,
              sse: this.opts.sse,
              geminiClient: this.opts.geminiClient,
            }
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.opts.dbCtx.db
            .update(assets)
            .set({ status: "FAILED", error: msg })
            .where(eq(assets.id, assetId))
            .run();
          this.opts.sse.emit({
            type: "asset.status",
            assetId,
            status: "FAILED",
            error: msg,
          });
          throw err;
        }
      }

      this.opts.dbCtx.db
        .update(jobs)
        .set({ status: "DONE", error: null, updatedAt: new Date() })
        .where(eq(jobs.id, job.id))
        .run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.opts.dbCtx.db
        .update(jobs)
        .set({ status: "FAILED", error: msg, updatedAt: new Date() })
        .where(eq(jobs.id, job.id))
        .run();
    }
  }
}

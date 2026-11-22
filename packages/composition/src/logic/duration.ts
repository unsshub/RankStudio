import type { Clip, RankingProject } from "../schema.js";
import { resolveOrder } from "./order.js";

export const COMPOSITION_FPS = 30;
export const TRANSITION_OVERLAP_SEC = 0.5;
export const MIN_CLIP_SEC = 0.5;

export function computeClipDurationSec(
  clip: Clip,
  voiceDurationSec?: number | null
): number {
  const rawTrim = Math.max(0, clip.trim.endSec - clip.trim.startSec);
  const trimDur = Math.max(MIN_CLIP_SEC, rawTrim);
  if (
    clip.voiceover.enabled &&
    clip.voiceover.audioAssetId &&
    typeof voiceDurationSec === "number" &&
    voiceDurationSec > 0
  ) {
    return Math.max(trimDur, voiceDurationSec);
  }
  return trimDur;
}

export function computeDurationSec(
  project: RankingProject,
  voiceDurationsByAssetId?: Record<string, number>
): number {
  const ordered = resolveOrder(project);
  if (ordered.length === 0) {
    return MIN_CLIP_SEC;
  }
  let total = 0;
  for (let i = 0; i < ordered.length; i++) {
    const clip = ordered[i];
    const voiceDur =
      clip.voiceover.audioAssetId && voiceDurationsByAssetId
        ? voiceDurationsByAssetId[clip.voiceover.audioAssetId]
        : undefined;
    total += computeClipDurationSec(clip, voiceDur);
    if (i > 0 && clip.animation.transition !== "none") {
      total -= TRANSITION_OVERLAP_SEC;
    }
  }
  return Math.max(MIN_CLIP_SEC, total);
}

export function computeDurationFrames(
  project: RankingProject,
  voiceDurationsByAssetId?: Record<string, number>,
  fps = COMPOSITION_FPS
): number {
  return Math.max(1, Math.round(computeDurationSec(project, voiceDurationsByAssetId) * fps));
}

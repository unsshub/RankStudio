import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { RankingProject } from "./schema.js";
import { resolveOrder } from "./logic/order.js";
import { computeClipDurationSec, TRANSITION_OVERLAP_SEC } from "./logic/duration.js";
import { getTransitionPresentation } from "./transitions.js";
import { TitleLayer } from "./layers/TitleLayer.js";
import { RankList } from "./layers/RankList.js";
import { ClipSequence, type ClipMediaUrls } from "./layers/ClipSequence.js";
import "./fonts.js";

export interface RankingVideoProps {
  project: RankingProject;
  engineUrl?: string;
  token?: string;
  assetPaths?: Record<string, string>;
  voiceDurations?: Record<string, number>;
  sfxPaths?: Record<string, string>;
}

function buildFileUrl(
  engineUrl: string | undefined,
  token: string | undefined,
  relPath: string | undefined
): string | undefined {
  if (!engineUrl || !relPath) return undefined;
  const base = engineUrl.replace(/\/$/, "");
  const cleanPath = relPath.replace(/^\/+/, "");
  const encoded = cleanPath.split("/").map(encodeURIComponent).join("/");
  const query = token ? `?t=${encodeURIComponent(token)}` : "";
  return `${base}/files/${encoded}${query}`;
}

export const RankingVideo: React.FC<RankingVideoProps> = ({
  project,
  engineUrl,
  token,
  assetPaths = {},
  voiceDurations = {},
  sfxPaths = {},
}) => {
  const { fps, width, height } = useVideoConfig();
  const orderedClips = resolveOrder(project);
  const transitionFrames = Math.round(TRANSITION_OVERLAP_SEC * fps);

  // Compute start frame of each clip in resolved playback order for RankList reveals
  const clipStartFrames: Record<string, number> = {};
  let cursorFrame = 0;
  for (let i = 0; i < orderedClips.length; i++) {
    const clip = orderedClips[i];
    if (i > 0 && clip.animation.transition !== "none") {
      cursorFrame = Math.max(0, cursorFrame - transitionFrames);
    }
    clipStartFrames[clip.id] = cursorFrame;
    const voiceDur = clip.voiceover.audioAssetId
      ? voiceDurations[clip.voiceover.audioAssetId]
      : undefined;
    const durFrames = Math.max(1, Math.round(computeClipDurationSec(clip, voiceDur) * fps));
    cursorFrame += durFrames;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: project.general.background }}>
      <TransitionSeries>
        {orderedClips.map((clip, index) => {
          const voiceDur = clip.voiceover.audioAssetId
            ? voiceDurations[clip.voiceover.audioAssetId]
            : undefined;
          const durFrames = Math.max(
            1,
            Math.round(computeClipDurationSec(clip, voiceDur) * fps)
          );
          const presentation =
            index > 0
              ? getTransitionPresentation(clip.animation.transition, width, height)
              : null;

          const urls: ClipMediaUrls = {
            videoUrl: buildFileUrl(
              engineUrl,
              token,
              clip.media.assetId ? assetPaths[clip.media.assetId] : undefined
            ),
            voiceUrl: buildFileUrl(
              engineUrl,
              token,
              clip.voiceover.audioAssetId
                ? assetPaths[clip.voiceover.audioAssetId]
                : undefined
            ),
            voiceDurationSec: voiceDur,
            sfxUrl: buildFileUrl(
              engineUrl,
              token,
              clip.sfx.id ? sfxPaths[clip.sfx.id] : undefined
            ),
          };

          return (
            <React.Fragment key={clip.id}>
              {presentation && (
                <TransitionSeries.Transition
                  presentation={presentation}
                  timing={linearTiming({ durationInFrames: transitionFrames })}
                />
              )}
              <TransitionSeries.Sequence durationInFrames={durFrames}>
                <ClipSequence
                  clip={clip}
                  videoHeightPct={project.general.videoHeightPct}
                  captionsEnabled={project.general.captions}
                  urls={urls}
                />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      <RankList project={project} clipStartFrames={clipStartFrames} />
      <TitleLayer title={project.title} />
    </AbsoluteFill>
  );
};

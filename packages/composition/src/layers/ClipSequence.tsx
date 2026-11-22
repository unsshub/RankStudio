import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, useVideoConfig } from "remotion";
import type { Clip } from "../schema.js";
import { Captions } from "./Captions.js";

export interface ClipMediaUrls {
  videoUrl?: string;
  voiceUrl?: string;
  voiceDurationSec?: number;
  sfxUrl?: string;
}

export interface ClipSequenceProps {
  clip: Clip;
  videoHeightPct: number;
  captionsEnabled: boolean;
  urls: ClipMediaUrls;
}

export const ClipSequence: React.FC<ClipSequenceProps> = ({
  clip,
  videoHeightPct,
  captionsEnabled,
  urls,
}) => {
  const { fps } = useVideoConfig();
  const startFromFrame = Math.max(0, Math.round(clip.trim.startSec * fps));
  const endAtFrame = Math.max(startFromFrame + 1, Math.round(clip.trim.endSec * fps));

  const topPct = 100 - videoHeightPct;

  return (
    <AbsoluteFill>
      {/* Video area positioned within bottom videoHeightPct and per-clip box insets */}
      <div
        style={{
          position: "absolute",
          top: `${topPct}%`,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: `${clip.box.top}%`,
            right: `${clip.box.right}%`,
            bottom: `${clip.box.bottom}%`,
            left: `${clip.box.left}%`,
            overflow: "hidden",
            backgroundColor: "#141418",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {urls.videoUrl ? (
            <OffthreadVideo
              src={urls.videoUrl}
              startFrom={startFromFrame}
              endAt={endAtFrame}
              volume={clip.volume}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                color: "#71717A",
                fontFamily: "'Inter', sans-serif",
                fontSize: "34px",
                textAlign: "center",
                padding: "40px",
              }}
            >
              Rank #{clip.rank} — Upload a clip
            </div>
          )}
        </div>
      </div>

      {/* Sound effect at clip start */}
      {urls.sfxUrl && (
        <Audio src={urls.sfxUrl} volume={clip.sfx.volume} />
      )}

      {/* Voiceover audio */}
      {clip.voiceover.enabled && urls.voiceUrl && (
        <Audio src={urls.voiceUrl} volume={1} />
      )}

      {/* Timed 3-word captions */}
      {captionsEnabled &&
        clip.voiceover.enabled &&
        clip.voiceover.script.trim().length > 0 && (
          <Captions
            script={clip.voiceover.script}
            durationSec={
              urls.voiceDurationSec ??
              Math.max(0.5, clip.trim.endSec - clip.trim.startSec)
            }
          />
        )}
    </AbsoluteFill>
  );
};

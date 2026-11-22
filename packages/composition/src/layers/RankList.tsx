import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Clip, RankingProject } from "../schema.js";
import { resolveFontFamily } from "../fontList.js";
import { getTextAnimation } from "../animations.js";

export interface RankListProps {
  project: RankingProject;
  clipStartFrames: Record<string, number>;
}

export const RankList: React.FC<RankListProps> = ({ project, clipStartFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sortedByRank = [...project.clips].sort((a, b) => a.rank - b.rank);

  return (
    <div
      style={{
        position: "absolute",
        left: `${project.numbers.x}%`,
        top: `${project.numbers.y}%`,
        transform: `scale(${project.numbers.scale})`,
        transformOrigin: "top left",
        zIndex: 25,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        pointerEvents: "none",
      }}
    >
      {sortedByRank.map((clip: Clip) => {
        const startFrame = clipStartFrames[clip.id] ?? Infinity;
        const isRevealed = frame >= startFrame;
        const localFrame = Math.max(0, frame - startFrame);
        const anim = isRevealed
          ? getTextAnimation(
              clip.animation.text.type,
              localFrame,
              fps,
              clip.animation.text.durationSec,
              clip.animation.text.delaySec,
              clip.title.text
            )
          : { style: { opacity: 0 }, visibleChars: 0 };

        const displayText =
          anim.visibleChars !== undefined
            ? clip.title.text.slice(0, anim.visibleChars)
            : clip.title.text;

        return (
          <div
            key={clip.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontFamily: resolveFontFamily(clip.number.fontFamily),
                fontSize: "54px",
                fontWeight: clip.number.bold ? 800 : 400,
                color: clip.number.color,
                WebkitTextStroke:
                  clip.number.strokeWidth > 0
                    ? `${clip.number.strokeWidth}px ${clip.number.strokeColor}`
                    : undefined,
                paintOrder: "stroke fill",
                minWidth: "60px",
                lineHeight: 1,
              }}
            >
              {clip.rank}.
            </span>
            {isRevealed && clip.title.text.trim().length > 0 && (
              <span
                style={{
                  fontFamily: resolveFontFamily(clip.title.style.fontFamily),
                  fontSize: `${clip.title.style.fontSize}px`,
                  fontWeight: clip.title.style.bold ? 700 : 400,
                  fontStyle: clip.title.style.italic ? "italic" : "normal",
                  color: clip.title.style.color,
                  backgroundColor: clip.title.style.highlight ?? "transparent",
                  padding: clip.title.style.highlight ? "2px 10px" : undefined,
                  borderRadius: clip.title.style.highlight ? "8px" : undefined,
                  WebkitTextStroke:
                    clip.title.style.strokeWidth > 0
                      ? `${clip.title.style.strokeWidth}px ${clip.title.style.strokeColor}`
                      : undefined,
                  paintOrder: "stroke fill",
                  lineHeight: 1.1,
                  ...anim.style,
                }}
              >
                {displayText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

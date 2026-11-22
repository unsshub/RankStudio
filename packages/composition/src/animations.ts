import type React from "react";
import { interpolate, spring } from "remotion";
import type { TextAnimationType } from "./schema.js";

export interface TextAnimationResult {
  style: React.CSSProperties;
  visibleChars?: number;
}

export function getTextAnimation(
  type: TextAnimationType,
  frame: number,
  fps: number,
  durationSec: number,
  delaySec: number,
  fullText: string
): TextAnimationResult {
  if (type === "none") {
    return { style: {} };
  }

  const delayFrames = Math.round(delaySec * fps);
  const durationFrames = Math.max(1, Math.round(durationSec * fps));
  const localFrame = frame - delayFrames;

  if (localFrame < 0) {
    return {
      style: { opacity: 0 },
      visibleChars: type === "typewriter" ? 0 : undefined,
    };
  }

  const progress = interpolate(localFrame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  switch (type) {
    case "fadeIn":
      return { style: { opacity: progress } };
    case "fadeInRight":
      return {
        style: {
          opacity: progress,
          transform: `translateX(${interpolate(progress, [0, 1], [-60, 0])}px)`,
        },
      };
    case "fadeInLeft":
      return {
        style: {
          opacity: progress,
          transform: `translateX(${interpolate(progress, [0, 1], [60, 0])}px)`,
        },
      };
    case "fadeInUp":
      return {
        style: {
          opacity: progress,
          transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
        },
      };
    case "fadeInDown":
      return {
        style: {
          opacity: progress,
          transform: `translateY(${interpolate(progress, [0, 1], [-40, 0])}px)`,
        },
      };
    case "zoomIn":
      return {
        style: {
          opacity: progress,
          transform: `scale(${interpolate(progress, [0, 1], [0.5, 1])})`,
        },
      };
    case "bounceIn": {
      const s = spring({
        frame: localFrame,
        fps,
        config: { damping: 10, stiffness: 180, mass: 0.8 },
        durationInFrames: durationFrames,
      });
      return {
        style: {
          opacity: Math.min(1, s * 2),
          transform: `scale(${interpolate(s, [0, 1], [0.3, 1])})`,
        },
      };
    }
    case "typewriter": {
      const visibleChars = Math.round(progress * fullText.length);
      return {
        style: { opacity: 1 },
        visibleChars,
      };
    }
  }
}

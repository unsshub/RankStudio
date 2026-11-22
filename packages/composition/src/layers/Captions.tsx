import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { buildCaptionChunks } from "../logic/captions.js";

export interface CaptionsProps {
  script: string;
  durationSec: number;
}

export const Captions: React.FC<CaptionsProps> = ({ script, durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  const chunks = buildCaptionChunks(script, durationSec, 3);
  const active = chunks.find((c) => currentSec >= c.startSec && currentSec <= c.endSec);

  if (!active) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "110px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "88%",
        textAlign: "center",
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: "52px",
          fontWeight: 900,
          color: "#FFFFFF",
          WebkitTextStroke: "6px #000000",
          paintOrder: "stroke fill",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          lineHeight: 1.15,
        }}
      >
        {active.text}
      </span>
    </div>
  );
};

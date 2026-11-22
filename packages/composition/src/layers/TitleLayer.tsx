import React from "react";
import type { RankingProject } from "../schema.js";
import { tiptapToSpans } from "../logic/tiptapToSpans.js";
import { resolveFontFamily } from "../fontList.js";

export interface TitleLayerProps {
  title: RankingProject["title"];
}

export const TitleLayer: React.FC<TitleLayerProps> = ({ title }) => {
  const lines = tiptapToSpans(title.doc);

  return (
    <div
      style={{
        position: "absolute",
        left: `${title.position.x}%`,
        top: `${title.position.y}%`,
        transform: "translate(-50%, 0)",
        width: "92%",
        textAlign: title.align,
        zIndex: 30,
        pointerEvents: "none",
        lineHeight: 1.1,
      }}
    >
      {lines.map((line, lineIdx) => (
        <div key={lineIdx} style={{ minHeight: "1em" }}>
          {line.map((span, spanIdx) => (
            <span
              key={spanIdx}
              style={{
                fontFamily: resolveFontFamily(span.fontFamily),
                fontSize: `${span.fontSize}px`,
                fontWeight: span.bold ? 800 : 400,
                fontStyle: span.italic ? "italic" : "normal",
                color: span.color,
                backgroundColor: span.highlight ?? "transparent",
                padding: span.highlight ? "2px 8px" : undefined,
                borderRadius: span.highlight ? "8px" : undefined,
                WebkitTextStroke:
                  title.strokeWidth > 0
                    ? `${title.strokeWidth}px ${title.strokeColor}`
                    : undefined,
                paintOrder: "stroke fill",
                whiteSpace: "pre-wrap",
              }}
            >
              {span.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

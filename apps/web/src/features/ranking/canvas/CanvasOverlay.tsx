import React, { useRef } from "react";
import Moveable from "react-moveable";
import { useRankingStore } from "../store";

interface CanvasOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({ containerRef }) => {
  const project = useRankingStore((s) => s.project);
  const dragTarget = useRankingStore((s) => s.dragTarget);
  const activeClipId = useRankingStore((s) => s.activeClipId);
  const updateProject = useRankingStore((s) => s.updateProject);
  const updateClip = useRankingStore((s) => s.updateClip);

  const targetRef = useRef<HTMLDivElement | null>(null);

  if (dragTarget === "none") return null;

  const activeClip =
    project.clips.find((c) => c.id === activeClipId) ?? project.clips[0];

  let boxStyle: React.CSSProperties = {};
  let label = "";

  if (dragTarget === "title") {
    label = "Title";
    boxStyle = {
      left: `${project.title.position.x}%`,
      top: `${project.title.position.y}%`,
      transform: "translate(-50%, 0)",
      width: "84%",
      height: "12%",
    };
  } else if (dragTarget === "numbers") {
    label = "Rank Numbers";
    boxStyle = {
      left: `${project.numbers.x}%`,
      top: `${project.numbers.y}%`,
      width: `${Math.min(80, 35 * project.numbers.scale)}%`,
      height: `${Math.min(70, 32 * project.numbers.scale)}%`,
    };
  } else if (dragTarget === "video" && activeClip) {
    label = `Clip #${activeClip.rank} Video`;
    const topBase = 100 - project.general.videoHeightPct;
    const vh = project.general.videoHeightPct;
    const topPct = topBase + (activeClip.box.top / 100) * vh;
    const bottomPct = (activeClip.box.bottom / 100) * vh;
    boxStyle = {
      left: `${activeClip.box.left}%`,
      right: `${activeClip.box.right}%`,
      top: `${topPct}%`,
      bottom: `${bottomPct}%`,
    };
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30">
      <div
        ref={targetRef}
        style={boxStyle}
        className="absolute border-2 border-dashed border-[#7C5CFF] bg-[#7C5CFF]/15 flex items-start justify-start p-1 cursor-move"
      >
        <span className="rounded bg-[#7C5CFF] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {label}
        </span>
      </div>

      <Moveable
        target={targetRef}
        draggable
        resizable={dragTarget === "numbers" || dragTarget === "video"}
        onDrag={({ delta }) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect || rect.width === 0 || rect.height === 0) return;
          const dxPct = (delta[0] / rect.width) * 100;
          const dyPct = (delta[1] / rect.height) * 100;

          if (dragTarget === "title") {
            updateProject((prev) => ({
              ...prev,
              title: {
                ...prev.title,
                position: {
                  x: Math.max(5, Math.min(95, Math.round((prev.title.position.x + dxPct) * 10) / 10)),
                  y: Math.max(0, Math.min(90, Math.round((prev.title.position.y + dyPct) * 10) / 10)),
                },
              },
            }));
          } else if (dragTarget === "numbers") {
            updateProject((prev) => ({
              ...prev,
              numbers: {
                ...prev.numbers,
                x: Math.max(0, Math.min(85, Math.round((prev.numbers.x + dxPct) * 10) / 10)),
                y: Math.max(0, Math.min(85, Math.round((prev.numbers.y + dyPct) * 10) / 10)),
              },
            }));
          } else if (dragTarget === "video" && activeClip) {
            updateClip(activeClip.id, (prev) => ({
              ...prev,
              box: {
                top: Math.max(-50, Math.min(80, Math.round((prev.box.top + dyPct) * 10) / 10)),
                bottom: Math.max(-50, Math.min(80, Math.round((prev.box.bottom - dyPct) * 10) / 10)),
                left: Math.max(-50, Math.min(80, Math.round((prev.box.left + dxPct) * 10) / 10)),
                right: Math.max(-50, Math.min(80, Math.round((prev.box.right - dxPct) * 10) / 10)),
              },
            }));
          }
        }}
        onResize={({ delta }) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect || rect.width === 0 || rect.height === 0) return;
          const dwPct = (delta[0] / rect.width) * 100;
          const dhPct = (delta[1] / rect.height) * 100;

          if (dragTarget === "numbers") {
            updateProject((prev) => ({
              ...prev,
              numbers: {
                ...prev.numbers,
                scale: Math.max(
                  0.4,
                  Math.min(2.5, Math.round((prev.numbers.scale + dwPct / 50) * 100) / 100)
                ),
              },
            }));
          } else if (dragTarget === "video" && activeClip) {
            updateClip(activeClip.id, (prev) => ({
              ...prev,
              box: {
                ...prev.box,
                right: Math.max(-50, Math.min(80, Math.round((prev.box.right - dwPct) * 10) / 10)),
                bottom: Math.max(-50, Math.min(80, Math.round((prev.box.bottom - dhPct) * 10) / 10)),
              },
            }));
          }
        }}
      />
    </div>
  );
};

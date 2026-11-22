import React from "react";
import { Move, RotateCcw } from "lucide-react";
import type { Clip } from "@rankstudio/composition";
import { useRankingStore } from "../../store";

interface SizePositionTabProps {
  clip: Clip;
  onChange: (updater: (prev: Clip) => Clip) => void;
}

export const SizePositionTab: React.FC<SizePositionTabProps> = ({
  clip,
  onChange,
}) => {
  const dragTarget = useRankingStore((s) => s.dragTarget);
  const setDragTarget = useRankingStore((s) => s.setDragTarget);
  const setActiveClipId = useRankingStore((s) => s.setActiveClipId);

  const toggleDragVideo = () => {
    setActiveClipId(clip.id);
    setDragTarget(dragTarget === "video" ? "none" : "video");
  };

  const fields: Array<{ key: keyof Clip["box"]; label: string }> = [
    { key: "top", label: "Top %" },
    { key: "right", label: "Right %" },
    { key: "bottom", label: "Bottom %" },
    { key: "left", label: "Left %" },
  ];

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleDragVideo}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium ${
            dragTarget === "video"
              ? "bg-[#7C5CFF] text-white"
              : "border border-[#2A2A32] bg-[#0E0E10] text-zinc-300 hover:border-zinc-500"
          }`}
        >
          <Move className="h-3.5 w-3.5" />
          {dragTarget === "video" ? "Dragging Video…" : "Drag Video on Canvas"}
        </button>

        <button
          type="button"
          onClick={() =>
            onChange((prev) => ({
              ...prev,
              box: { top: 0, right: 0, bottom: 0, left: 0 },
            }))
          }
          className="flex items-center gap-1 text-zinc-400 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {fields.map(({ key, label }) => (
          <label key={key} className="space-y-1 text-zinc-400">
            <span>{label}</span>
            <input
              type="number"
              min={-50}
              max={80}
              step={1}
              value={clip.box[key]}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  box: { ...prev.box, [key]: Number(e.target.value) || 0 },
                }))
              }
              className="w-full rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
            />
          </label>
        ))}
      </div>
    </div>
  );
};

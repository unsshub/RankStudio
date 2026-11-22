import React from "react";
import { Move } from "lucide-react";
import { useRankingStore } from "../store";

export const NumberDrag: React.FC = () => {
  const project = useRankingStore((s) => s.project);
  const updateProject = useRankingStore((s) => s.updateProject);
  const dragTarget = useRankingStore((s) => s.dragTarget);
  const setDragTarget = useRankingStore((s) => s.setDragTarget);

  const toggleDrag = () => {
    const next = dragTarget === "numbers" ? "none" : "numbers";
    setDragTarget(next);
    updateProject((prev) => ({
      ...prev,
      numbers: { ...prev.numbers, dragEnabled: next === "numbers" },
    }));
  };

  return (
    <section className="rounded-xl border border-[#2A2A32] bg-[#17171B] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Rank Numbers Position</h2>
        <button
          type="button"
          onClick={toggleDrag}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            dragTarget === "numbers"
              ? "bg-[#7C5CFF] text-white"
              : "border border-[#2A2A32] bg-[#0E0E10] text-zinc-300 hover:border-zinc-600"
          }`}
        >
          <Move className="h-3.5 w-3.5" />
          {dragTarget === "numbers" ? "Dragging Numbers…" : "Drag & Resize"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-zinc-400">
        <label className="space-y-1">
          <span>X: {project.numbers.x}%</span>
          <input
            type="range"
            min={0}
            max={85}
            value={project.numbers.x}
            onChange={(e) =>
              updateProject((prev) => ({
                ...prev,
                numbers: { ...prev.numbers, x: Number(e.target.value) },
              }))
            }
            className="w-full accent-[#7C5CFF]"
          />
        </label>
        <label className="space-y-1">
          <span>Y: {project.numbers.y}%</span>
          <input
            type="range"
            min={0}
            max={85}
            value={project.numbers.y}
            onChange={(e) =>
              updateProject((prev) => ({
                ...prev,
                numbers: { ...prev.numbers, y: Number(e.target.value) },
              }))
            }
            className="w-full accent-[#7C5CFF]"
          />
        </label>
        <label className="space-y-1">
          <span>Scale: {project.numbers.scale.toFixed(2)}x</span>
          <input
            type="range"
            min={0.4}
            max={2.2}
            step={0.05}
            value={project.numbers.scale}
            onChange={(e) =>
              updateProject((prev) => ({
                ...prev,
                numbers: { ...prev.numbers, scale: Number(e.target.value) },
              }))
            }
            className="w-full accent-[#7C5CFF]"
          />
        </label>
      </div>
    </section>
  );
};

import React from "react";
import { useRankingStore } from "../store";
import { ColorPopover } from "../title/ColorPopover";

export const GeneralSettings: React.FC = () => {
  const project = useRankingStore((s) => s.project);
  const updateProject = useRankingStore((s) => s.updateProject);

  return (
    <section className="rounded-xl border border-[#2A2A32] bg-[#17171B] p-4 space-y-3">
      <h2 className="text-sm font-semibold text-white">General Settings</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Video Height</span>
            <span className="text-zinc-200 font-medium">
              {project.general.videoHeightPct}%{" "}
              <span className="text-zinc-500">
                (bar {100 - project.general.videoHeightPct}%)
              </span>
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            value={project.general.videoHeightPct}
            onChange={(e) =>
              updateProject((prev) => ({
                ...prev,
                general: { ...prev.general, videoHeightPct: Number(e.target.value) },
              }))
            }
            className="w-full accent-[#7C5CFF]"
          />
        </label>

        <div className="space-y-1 text-xs text-zinc-400">
          <div>Background</div>
          <ColorPopover
            label={project.general.background}
            value={project.general.background}
            onChange={(hex) =>
              updateProject((prev) => ({
                ...prev,
                general: { ...prev.general, background: hex },
              }))
            }
          />
        </div>

        <label className="flex items-center justify-between rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-xs text-zinc-200 cursor-pointer">
          <span>Auto Captions</span>
          <input
            type="checkbox"
            checked={project.general.captions}
            onChange={(e) =>
              updateProject((prev) => ({
                ...prev,
                general: { ...prev.general, captions: e.target.checked },
              }))
            }
            className="h-4 w-4 accent-[#7C5CFF]"
          />
        </label>
      </div>
    </section>
  );
};

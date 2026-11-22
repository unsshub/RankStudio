import React from "react";
import type { Clip } from "@rankstudio/composition";
import { FontPicker } from "../../title/FontPicker";
import { ColorPopover } from "../../title/ColorPopover";

interface VideoTitleTabProps {
  clip: Clip;
  onChange: (updater: (prev: Clip) => Clip) => void;
}

export const VideoTitleTab: React.FC<VideoTitleTabProps> = ({ clip, onChange }) => {
  const { style } = clip.title;
  const updateStyle = (patch: Partial<Clip["title"]["style"]>) =>
    onChange((prev) => ({
      ...prev,
      title: { ...prev.title, style: { ...prev.title.style, ...patch } },
    }));

  return (
    <div className="space-y-3 text-xs">
      <input
        type="text"
        value={clip.title.text}
        onChange={(e) =>
          onChange((prev) => ({
            ...prev,
            title: { ...prev.title, text: e.target.value },
          }))
        }
        placeholder={`Label for #${clip.rank}`}
        className="w-full rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-sm text-white focus:border-[#7C5CFF] focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        <FontPicker
          value={style.fontFamily}
          onChange={(fontFamily) => updateStyle({ fontFamily })}
        />
        <label className="flex items-center gap-1 text-zinc-400">
          Size
          <input
            type="number"
            min={14}
            max={96}
            value={style.fontSize}
            onChange={(e) => updateStyle({ fontSize: Number(e.target.value) || 28 })}
            className="w-16 rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
          />
        </label>
        <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={style.bold}
            onChange={(e) => updateStyle({ bold: e.target.checked })}
            className="accent-[#7C5CFF]"
          />
          Bold
        </label>
        <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={style.italic}
            onChange={(e) => updateStyle({ italic: e.target.checked })}
            className="accent-[#7C5CFF]"
          />
          Italic
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ColorPopover
          label="Text"
          value={style.color}
          onChange={(color) => updateStyle({ color })}
        />
        <ColorPopover
          label="Highlight"
          value={style.highlight ?? ""}
          allowClear
          onChange={(highlight) => updateStyle({ highlight })}
          onClear={() => updateStyle({ highlight: null })}
        />
        <ColorPopover
          label="Stroke"
          value={style.strokeColor}
          onChange={(strokeColor) => updateStyle({ strokeColor })}
        />
        <label className="flex items-center gap-1.5 text-zinc-400">
          Width: {style.strokeWidth}
          <input
            type="range"
            min={0}
            max={20}
            value={style.strokeWidth}
            onChange={(e) => updateStyle({ strokeWidth: Number(e.target.value) })}
            className="w-24 accent-[#7C5CFF]"
          />
        </label>
      </div>
    </div>
  );
};

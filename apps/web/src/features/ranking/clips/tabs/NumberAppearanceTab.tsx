import React from "react";
import type { Clip } from "@rankstudio/composition";
import { FontPicker } from "../../title/FontPicker";
import { ColorPopover } from "../../title/ColorPopover";

interface NumberAppearanceTabProps {
  clip: Clip;
  onChange: (updater: (prev: Clip) => Clip) => void;
}

export const NumberAppearanceTab: React.FC<NumberAppearanceTabProps> = ({
  clip,
  onChange,
}) => {
  const updateNum = (patch: Partial<Clip["number"]>) =>
    onChange((prev) => ({
      ...prev,
      number: { ...prev.number, ...patch },
    }));

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <FontPicker
        value={clip.number.fontFamily}
        onChange={(fontFamily) => updateNum({ fontFamily })}
      />
      <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
        <input
          type="checkbox"
          checked={clip.number.bold}
          onChange={(e) => updateNum({ bold: e.target.checked })}
          className="accent-[#7C5CFF]"
        />
        Bold
      </label>
      <ColorPopover
        label="Number"
        value={clip.number.color}
        onChange={(color) => updateNum({ color })}
      />
      <ColorPopover
        label="Stroke"
        value={clip.number.strokeColor}
        onChange={(strokeColor) => updateNum({ strokeColor })}
      />
      <label className="flex items-center gap-1.5 text-zinc-400">
        Stroke: {clip.number.strokeWidth}px
        <input
          type="range"
          min={0}
          max={20}
          value={clip.number.strokeWidth}
          onChange={(e) => updateNum({ strokeWidth: Number(e.target.value) })}
          className="w-24 accent-[#7C5CFF]"
        />
      </label>
    </div>
  );
};

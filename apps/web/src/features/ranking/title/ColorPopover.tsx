import React, { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { addRecentColor, getRecentColors } from "../../../lib/settings";

const PRESET_SWATCHES = [
  "#FFFFFF",
  "#000000",
  "#7C5CFF",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EC4899",
  "#FFD700",
  "#2B2A2A",
];

interface ColorPopoverProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  allowClear?: boolean;
  onClear?: () => void;
}

export const ColorPopover: React.FC<ColorPopoverProps> = ({
  value,
  onChange,
  label,
  allowClear,
  onClear,
}) => {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(getRecentColors);

  const selectColor = (hex: string) => {
    onChange(hex);
    setRecent(addRecentColor(hex));
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-xs text-zinc-200 hover:border-zinc-600"
      >
        <span
          className="h-3.5 w-3.5 rounded-sm border border-zinc-600"
          style={{ backgroundColor: value || "transparent" }}
        />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-[#2A2A32] bg-[#17171B] p-3 shadow-2xl">
          <HexColorPicker color={value || "#FFFFFF"} onChange={selectColor} />

          <div className="mt-2.5 flex items-center gap-1.5">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 font-mono text-xs text-white"
            />
            {allowClear && onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="rounded border border-[#2A2A32] px-2 py-1 text-xs text-zinc-400 hover:text-white"
              >
                None
              </button>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {PRESET_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => selectColor(swatch)}
                className="h-5 w-5 rounded border border-zinc-700"
                style={{ backgroundColor: swatch }}
                title={swatch}
              />
            ))}
          </div>

          {recent.length > 0 && (
            <div className="mt-2 border-t border-[#2A2A32] pt-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                Recent
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectColor(c)}
                    className="h-4 w-4 rounded border border-zinc-700"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2.5 w-full rounded bg-zinc-800 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

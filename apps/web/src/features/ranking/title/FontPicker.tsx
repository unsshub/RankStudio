import React from "react";
import { FONT_LIST, resolveFontFamily } from "@rankstudio/composition";

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
}

export const FontPicker: React.FC<FontPickerProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-xs text-zinc-100 focus:border-[#7C5CFF] focus:outline-none"
      style={{ fontFamily: resolveFontFamily(value) }}
    >
      {FONT_LIST.map((f) => (
        <option
          key={f.label}
          value={f.label}
          style={{ fontFamily: resolveFontFamily(f.label) }}
        >
          {f.label}
        </option>
      ))}
    </select>
  );
};

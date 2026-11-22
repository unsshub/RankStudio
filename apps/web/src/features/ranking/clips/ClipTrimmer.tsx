import React, { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import type { AssetRecord } from "@rankstudio/shared";
import type { Clip } from "@rankstudio/composition";
import { buildFileUrl } from "../../../lib/fileUrl";

interface ClipTrimmerProps {
  clip: Clip;
  asset: AssetRecord;
  onChangeTrim: (startSec: number, endSec: number) => void;
  onChangeVolume: (volume: number) => void;
}

export const ClipTrimmer: React.FC<ClipTrimmerProps> = ({
  clip,
  asset,
  onChangeTrim,
  onChangeVolume,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const totalSec = Math.max(0.5, asset.durationSec ?? clip.trim.endSec ?? 3);
  const startSec = Math.max(0, Math.min(clip.trim.startSec, totalSec - 0.5));
  const endSec = Math.max(startSec + 0.5, Math.min(clip.trim.endSec, totalSec));

  const filmstripUrl = buildFileUrl(asset.filmstrip);
  const waveformUrl = buildFileUrl(asset.waveform);

  useEffect(() => {
    if (!waveformUrl) return;
    let cancelled = false;
    fetch(waveformUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { peaks?: number[] } | null) => {
        if (!cancelled && data?.peaks) {
          setPeaks(data.peaks);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [waveformUrl]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const sec = Math.round(ratio * totalSec * 10) / 10;
      if (dragging === "start") {
        onChangeTrim(Math.min(sec, endSec - 0.5), endSec);
      } else {
        onChangeTrim(startSec, Math.max(sec, startSec + 0.5));
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, totalSec, startSec, endSec, onChangeTrim]);

  const startPct = (startSec / totalSec) * 100;
  const endPct = (endSec / totalSec) * 100;

  const nudge = (which: "start" | "end", delta: number) => {
    if (which === "start") {
      const next = Math.max(0, Math.min(endSec - 0.5, Math.round((startSec + delta) * 10) / 10));
      onChangeTrim(next, endSec);
    } else {
      const next = Math.min(totalSec, Math.max(startSec + 0.5, Math.round((endSec + delta) * 10) / 10));
      onChangeTrim(startSec, next);
    }
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-[#2A2A32] bg-[#0E0E10] p-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          Trim: <strong className="text-emerald-400">{startSec.toFixed(1)}s</strong> →{" "}
          <strong className="text-rose-400">{endSec.toFixed(1)}s</strong>{" "}
          <span className="text-zinc-500">({(endSec - startSec).toFixed(1)}s)</span>
        </span>
        <span className="text-[11px] text-zinc-500">Focus handle + ←/→ to nudge 0.1s</span>
      </div>

      {/* Filmstrip + Waveform track */}
      <div
        ref={trackRef}
        className="relative h-16 w-full select-none overflow-hidden rounded-md border border-[#2A2A32] bg-[#141418]"
      >
        {filmstripUrl && (
          <img
            src={filmstripUrl}
            alt="Filmstrip"
            className="h-full w-full object-cover opacity-55 pointer-events-none"
          />
        )}

        {/* Waveform overlay */}
        {peaks.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-8 items-end gap-px px-0.5 opacity-80">
            {peaks.filter((_, idx) => idx % 4 === 0).map((p, idx) => (
              <div
                key={idx}
                className="flex-1 bg-[#7C5CFF]/70"
                style={{ height: `${Math.max(8, Math.round(p * 100))}%` }}
              />
            ))}
          </div>
        )}

        {/* Dimmed outside regions */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-black/65"
          style={{ width: `${startPct}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-black/65"
          style={{ width: `${100 - endPct}%` }}
        />

        {/* Selected range border */}
        <div
          className="pointer-events-none absolute inset-y-0 border-y-2 border-[#7C5CFF]"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Green Start Handle */}
        <button
          type="button"
          aria-label="Trim start"
          onPointerDown={() => setDragging("start")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") nudge("start", -0.1);
            if (e.key === "ArrowRight") nudge("start", 0.1);
          }}
          style={{ left: `${startPct}%` }}
          className="absolute inset-y-0 z-10 w-2.5 -translate-x-1/2 cursor-ew-resize bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-white"
        />

        {/* Red End Handle */}
        <button
          type="button"
          aria-label="Trim end"
          onPointerDown={() => setDragging("end")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") nudge("end", -0.1);
            if (e.key === "ArrowRight") nudge("end", 0.1);
          }}
          style={{ left: `${endPct}%` }}
          className="absolute inset-y-0 z-10 w-2.5 -translate-x-1/2 cursor-ew-resize bg-rose-500 hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-white"
        />
      </div>

      {/* Volume control */}
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
        <span className="w-20">Volume: {Math.round(clip.volume * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip.volume}
          onChange={(e) => onChangeVolume(Number(e.target.value))}
          className="flex-1 accent-[#7C5CFF]"
        />
      </label>
    </div>
  );
};

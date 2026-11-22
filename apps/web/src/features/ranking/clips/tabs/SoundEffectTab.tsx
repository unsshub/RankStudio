import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Search, Upload, Volume2, X } from "lucide-react";
import type { Clip } from "@rankstudio/composition";
import type { SfxItem } from "@rankstudio/shared";
import { engineFetch, uploadAssetWithProgress } from "../../../../lib/engine";
import { buildFileUrl } from "../../../../lib/fileUrl";
import { useToast } from "../../../../components/Toast";

interface SoundEffectTabProps {
  clip: Clip;
  onChange: (updater: (prev: Clip) => Clip) => void;
}

export const SoundEffectTab: React.FC<SoundEffectTabProps> = ({
  clip,
  onChange,
}) => {
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sfxList = [] } = useQuery({
    queryKey: ["sfx", query],
    queryFn: () =>
      engineFetch<SfxItem[]>(`/sfx${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  });

  const previewSound = (item: SfxItem) => {
    const url = buildFileUrl(item.path);
    if (!url) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.volume = clip.sfx.volume;
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  const handleUploadSfx = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadAssetWithProgress(file, "SFX_UPLOAD");
      queryClient.invalidateQueries({ queryKey: ["sfx"] });
      toast("Sound effect uploaded", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "SFX upload failed", "error");
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sound effects…"
            className="w-full rounded-lg border border-[#2A2A32] bg-[#0E0E10] py-1.5 pl-8 pr-3 text-xs text-white focus:border-[#7C5CFF] focus:outline-none"
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.wav,.ogg,.m4a,audio/*"
          className="hidden"
          onChange={(e) => {
            handleUploadSfx(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-2.5 py-1.5 text-zinc-200 hover:border-[#7C5CFF]"
        >
          <Upload className="h-3.5 w-3.5" /> Upload SFX
        </button>

        {clip.sfx.id && (
          <button
            type="button"
            onClick={() =>
              onChange((prev) => ({ ...prev, sfx: { ...prev.sfx, id: null } }))
            }
            className="flex items-center gap-1 rounded-lg border border-[#2A2A32] px-2 py-1.5 text-zinc-400 hover:text-white"
            title="Clear SFX"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-zinc-400">
        <Volume2 className="h-3.5 w-3.5" />
        <span className="w-28">Effect Volume: {Math.round(clip.sfx.volume * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip.sfx.volume}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              sfx: { ...prev.sfx, volume: Number(e.target.value) },
            }))
          }
          className="flex-1 accent-[#7C5CFF]"
        />
      </label>

      <div className="max-h-44 overflow-y-auto divide-y divide-[#22222A] rounded-lg border border-[#2A2A32] bg-[#0E0E10]">
        {sfxList.length === 0 ? (
          <div className="p-3 text-center text-zinc-500">No sound effects found</div>
        ) : (
          sfxList.map((item) => {
            const selected = clip.sfx.id === item.id;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-3 py-1.5 ${
                  selected ? "bg-[#7C5CFF]/20" : "hover:bg-zinc-900"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      sfx: { ...prev.sfx, id: item.id },
                    }))
                  }
                  className="flex flex-1 items-center justify-between pr-2 text-left"
                >
                  <span className="font-medium text-zinc-200">{item.name}</span>
                  <span className="text-[10px] text-zinc-500">
                    {item.category} · {item.durationSec.toFixed(1)}s
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => previewSound(item)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  title="Preview sound"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
} from "lucide-react";
import type { AssetRecord } from "@rankstudio/shared";
import { useRankingStore } from "../store";
import { UploadDropzone } from "./UploadDropzone";
import { ClipTrimmer } from "./ClipTrimmer";
import { VideoTitleTab } from "./tabs/VideoTitleTab";
import { NumberAppearanceTab } from "./tabs/NumberAppearanceTab";
import { SizePositionTab } from "./tabs/SizePositionTab";
import { VoiceoverTab } from "./tabs/VoiceoverTab";
import { AnimationTab } from "./tabs/AnimationTab";
import { SoundEffectTab } from "./tabs/SoundEffectTab";

const TABS = [
  { id: "title", label: "Video Title" },
  { id: "number", label: "Number" },
  { id: "position", label: "Size & Pos" },
  { id: "voiceover", label: "Voiceover" },
  { id: "animation", label: "Animation" },
  { id: "sfx", label: "Sound Effect" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ClipAccordionProps {
  assetsById: Record<string, AssetRecord>;
}

export const ClipAccordion: React.FC<ClipAccordionProps> = ({ assetsById }) => {
  const project = useRankingStore((s) => s.project);
  const activeClipId = useRankingStore((s) => s.activeClipId);
  const setActiveClipId = useRankingStore((s) => s.setActiveClipId);
  const updateClip = useRankingStore((s) => s.updateClip);
  const addClip = useRankingStore((s) => s.addClip);
  const deleteClip = useRankingStore((s) => s.deleteClip);
  const moveClip = useRankingStore((s) => s.moveClip);

  const [activeTabByClip, setActiveTabByClip] = useState<Record<string, TabId>>({});

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Rank Slots ({project.clips.length})
        </h2>
        <button
          type="button"
          onClick={addClip}
          className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFF] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6C49F5]"
        >
          <Plus className="h-3.5 w-3.5" /> Add More Video
        </button>
      </div>

      <div className="space-y-2.5">
        {project.clips.map((clip, idx) => {
          const expanded = activeClipId === clip.id;
          const asset = clip.media.assetId ? assetsById[clip.media.assetId] : undefined;
          const activeTab: TabId = activeTabByClip[clip.id] ?? "title";

          return (
            <div
              key={clip.id}
              className="rounded-xl border border-[#2A2A32] bg-[#17171B] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => setActiveClipId(expanded ? null : clip.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  )}
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7C5CFF]/20 text-xs font-bold text-[#7C5CFF]">
                    #{clip.rank}
                  </span>
                  <span className="text-sm font-medium text-white truncate">
                    {clip.title.text || `Clip #${clip.rank}`}
                  </span>
                  {asset && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        asset.status === "READY"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : asset.status === "FAILED"
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {asset.status}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveClip(clip.id, "up")}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === project.clips.length - 1}
                    onClick={() => moveClip(clip.id, "down")}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={project.clips.length <= 1}
                    onClick={() => deleteClip(clip.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-30"
                    title="Delete clip"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              {expanded && (
                <div className="border-t border-[#2A2A32] p-3.5 space-y-3.5">
                  <UploadDropzone
                    clipRank={clip.rank}
                    asset={asset}
                    onUploaded={(uploaded) => {
                      updateClip(clip.id, (prev) => ({
                        ...prev,
                        media: {
                          assetId: uploaded.id,
                          durationSec: uploaded.durationSec,
                          width: uploaded.width,
                          height: uploaded.height,
                        },
                        trim: {
                          startSec: 0,
                          endSec: Math.max(0.5, uploaded.durationSec ?? 3),
                        },
                      }));
                    }}
                  />

                  {asset && asset.status === "READY" && (
                    <ClipTrimmer
                      clip={clip}
                      asset={asset}
                      onChangeTrim={(startSec, endSec) =>
                        updateClip(clip.id, (prev) => ({
                          ...prev,
                          trim: { startSec, endSec },
                        }))
                      }
                      onChangeVolume={(volume) =>
                        updateClip(clip.id, (prev) => ({ ...prev, volume }))
                      }
                    />
                  )}

                  {/* 6 Per-clip tabs */}
                  <div className="flex flex-wrap gap-1 border-b border-[#2A2A32] pb-2">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setActiveTabByClip((prev) => ({ ...prev, [clip.id]: t.id }))
                        }
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          activeTab === t.id
                            ? "bg-[#7C5CFF] text-white"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    {activeTab === "title" && (
                      <VideoTitleTab
                        clip={clip}
                        onChange={(u) => updateClip(clip.id, u)}
                      />
                    )}
                    {activeTab === "number" && (
                      <NumberAppearanceTab
                        clip={clip}
                        onChange={(u) => updateClip(clip.id, u)}
                      />
                    )}
                    {activeTab === "position" && (
                      <SizePositionTab
                        clip={clip}
                        onChange={(u) => updateClip(clip.id, u)}
                      />
                    )}
                    {activeTab === "voiceover" && (
                      <VoiceoverTab
                        clip={clip}
                        onChange={(u) => updateClip(clip.id, u)}
                      />
                    )}
                    {activeTab === "animation" && (
                      <AnimationTab
                        clip={clip}
                        onChange={(u) => updateClip(clip.id, u)}
                      />
                    )}
                    {activeTab === "sfx" && (
                      <SoundEffectTab
                        clip={clip}
                        onChange={(u) => updateClip(clip.id, u)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

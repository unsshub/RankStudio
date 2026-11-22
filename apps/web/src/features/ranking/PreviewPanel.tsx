import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { HelpCircle, X } from "lucide-react";
import {
  RankingVideo,
  computeDurationFrames,
  COMPOSITION_FPS,
} from "@rankstudio/composition";
import type { AssetRecord, SfxItem } from "@rankstudio/shared";
import { getEngineUrl, getToken } from "../../lib/settings";
import { useRankingStore } from "./store";
import { CanvasOverlay } from "./canvas/CanvasOverlay";

interface PreviewPanelProps {
  assetsById: Record<string, AssetRecord>;
  sfxItems: SfxItem[];
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  assetsById,
  sfxItems,
}) => {
  const project = useRankingStore((s) => s.project);
  const dragTarget = useRankingStore((s) => s.dragTarget);
  const setDragTarget = useRankingStore((s) => s.setDragTarget);
  const playerRef = useRef<PlayerRef | null>(null);
  const frameBoxRef = useRef<HTMLDivElement | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const assetPaths = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, asset] of Object.entries(assetsById)) {
      if (asset.status === "READY") {
        map[id] = asset.path;
      }
    }
    return map;
  }, [assetsById]);

  const voiceDurations = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [id, asset] of Object.entries(assetsById)) {
      if (asset.kind === "VOICE" && typeof asset.durationSec === "number") {
        map[id] = asset.durationSec;
      }
    }
    return map;
  }, [assetsById]);

  const sfxPaths = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sfxItems) {
      map[s.id] = s.path;
    }
    return map;
  }, [sfxItems]);

  const durationInFrames = computeDurationFrames(
    project,
    voiceDurations,
    COMPOSITION_FPS
  );

  // Space shortcut for play/pause when not typing in an input/editor
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const editable = (e.target as HTMLElement | null)?.isContentEditable;
      if (
        editable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON"
      ) {
        return;
      }
      e.preventDefault();
      playerRef.current?.toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="sticky top-4 flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[340px] items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Live 9:16 Preview ({(durationInFrames / COMPOSITION_FPS).toFixed(1)}s)
        </div>
        <div className="relative flex items-center gap-1.5">
          {dragTarget !== "none" && (
            <button
              type="button"
              onClick={() => setDragTarget("none")}
              className="rounded bg-[#7C5CFF] px-2 py-0.5 text-[11px] font-medium text-white"
            >
              Done Dragging
            </button>
          )}
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Preview help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {helpOpen && (
            <div className="absolute right-0 top-full z-40 mt-1.5 w-64 rounded-xl border border-[#2A2A32] bg-[#17171B] p-3 text-xs text-zinc-300 shadow-2xl">
              <div className="mb-1.5 flex items-center justify-between font-semibold text-white">
                <span>Preview Shortcuts</span>
                <button type="button" onClick={() => setHelpOpen(false)}>
                  <X className="h-3.5 w-3.5 text-zinc-400" />
                </button>
              </div>
              <ul className="space-y-1 text-zinc-400">
                <li>
                  <kbd className="rounded bg-zinc-800 px-1 text-zinc-200">Space</kbd>{" "}
                  Play / Pause
                </li>
                <li>
                  <kbd className="rounded bg-zinc-800 px-1 text-zinc-200">Ctrl+Z</kbd>{" "}
                  Undo ·{" "}
                  <kbd className="rounded bg-zinc-800 px-1 text-zinc-200">
                    Ctrl+Shift+Z
                  </kbd>{" "}
                  Redo
                </li>
                <li>Preview and final MP4 share the exact same Remotion composition.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div
        ref={frameBoxRef}
        className="relative w-full max-w-[340px] aspect-[9/16] overflow-hidden rounded-2xl border border-[#2A2A32] bg-black shadow-2xl"
      >
        <Player
          ref={playerRef}
          component={RankingVideo}
          inputProps={{
            project,
            engineUrl: getEngineUrl(),
            token: getToken(),
            assetPaths,
            voiceDurations,
            sfxPaths,
          }}
          durationInFrames={durationInFrames}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={COMPOSITION_FPS}
          controls
          allowFullscreen
          style={{ width: "100%", height: "100%" }}
        />
        <CanvasOverlay containerRef={frameBoxRef} />
      </div>
    </div>
  );
};

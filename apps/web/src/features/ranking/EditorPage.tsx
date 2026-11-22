import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Sparkles,
  Undo2,
  Redo2,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { AssetRecord, ProjectRecord, SfxItem } from "@rankstudio/shared";
import type { RankingProject } from "@rankstudio/composition";
import { engineFetch } from "../../lib/engine";
import { useToast } from "../../components/Toast";
import { useRankingStore } from "./store";
import { TitleEditor } from "./title/TitleEditor";
import { GeneralSettings } from "./settings/GeneralSettings";
import { NumberDrag } from "./settings/NumberDrag";
import { PlaybackOrder } from "./settings/PlaybackOrder";
import { ClipAccordion } from "./clips/ClipAccordion";
import { PreviewPanel } from "./PreviewPanel";
import { RecentlyCreated } from "./RecentlyCreated";

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const projectId = useRankingStore((s) => s.projectId);
  const projectName = useRankingStore((s) => s.projectName);
  const project = useRankingStore((s) => s.project);
  const dirty = useRankingStore((s) => s.dirty);
  const saveStatus = useRankingStore((s) => s.saveStatus);
  const hydrate = useRankingStore((s) => s.hydrate);
  const setProjectName = useRankingStore((s) => s.setProjectName);
  const setSaveStatus = useRankingStore((s) => s.setSaveStatus);
  const markClean = useRankingStore((s) => s.markClean);
  const updateClip = useRankingStore((s) => s.updateClip);

  const [rendering, setRendering] = useState(false);
  const hydratedIdRef = useRef<string | null>(null);

  const { data: loadedProject, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => engineFetch<ProjectRecord<RankingProject>>(`/projects/${id}`),
    enabled: Boolean(id),
  });

  const { data: assetsList = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => engineFetch<AssetRecord[]>("/assets"),
    refetchInterval: 4000,
  });

  const { data: sfxItems = [] } = useQuery({
    queryKey: ["sfx", ""],
    queryFn: () => engineFetch<SfxItem[]>("/sfx"),
  });

  const assetsById = useMemo(() => {
    const map: Record<string, AssetRecord> = {};
    for (const a of assetsList) {
      map[a.id] = a;
    }
    return map;
  }, [assetsList]);

  // Hydrate store when project loads
  useEffect(() => {
    if (loadedProject && hydratedIdRef.current !== loadedProject.id) {
      hydratedIdRef.current = loadedProject.id;
      hydrate(loadedProject.id, loadedProject.name, loadedProject.data);
      useRankingStore.temporal.getState().clear();
    }
  }, [loadedProject, hydrate]);

  // Sync READY asset durations into clips that don't have durationSec yet
  useEffect(() => {
    for (const clip of project.clips) {
      if (!clip.media.assetId) continue;
      const asset = assetsById[clip.media.assetId];
      if (
        asset &&
        asset.status === "READY" &&
        asset.durationSec &&
        clip.media.durationSec !== asset.durationSec
      ) {
        updateClip(clip.id, (prev) => ({
          ...prev,
          media: {
            ...prev.media,
            durationSec: asset.durationSec,
            width: asset.width,
            height: asset.height,
          },
          trim: {
            startSec: Math.min(prev.trim.startSec, Math.max(0, asset.durationSec! - 0.5)),
            endSec: Math.min(
              Math.max(0.5, prev.trim.endSec === 3 ? asset.durationSec! : prev.trim.endSec),
              asset.durationSec!
            ),
          },
        }));
      }
    }
  }, [assetsById, project.clips, updateClip]);

  const saveNow = useCallback(async () => {
    if (!projectId) return;
    setSaveStatus("saving");
    try {
      await engineFetch(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: projectName, data: project }),
      });
      markClean();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch {
      setSaveStatus("error");
    }
  }, [projectId, projectName, project, setSaveStatus, markClean, queryClient]);

  // Debounced 800ms autosave
  useEffect(() => {
    if (!dirty || !projectId) return;
    const timer = setTimeout(() => {
      saveNow();
    }, 800);
    return () => clearTimeout(timer);
  }, [dirty, projectId, project, projectName, saveNow]);

  // Unsaved-change browser guard
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Ctrl+Z / Ctrl+Shift+Z undo/redo shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const editable = (e.target as HTMLElement | null)?.isContentEditable;
      if (editable || tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) {
        useRankingStore.temporal.getState().redo();
      } else {
        useRankingStore.temporal.getState().undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleGenerate = async () => {
    if (!projectId) return;
    setRendering(true);
    try {
      await saveNow();
      await engineFetch(`/projects/${projectId}/render`, { method: "POST" });
      toast("Render started! Tracking progress in Library…", "success");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/library?filter=video-ranking");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not start render", "error");
    } finally {
      setRendering(false);
    }
  };

  if (isLoading || !loadedProject) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Loading project…
      </div>
    );
  }

  return (
    <div className="min-h-full p-5">
      {/* Mobile / narrow viewport warning (<1024px) */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 lg:hidden">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          RankStudio Editor is designed for screens at least 1024 px wide. Some controls
          may feel cramped on smaller viewports.
        </span>
      </div>

      {/* Top Bar */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A2A32] bg-[#17171B] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            aria-label="Project name"
            className="w-full max-w-sm rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-white hover:border-[#2A2A32] focus:border-[#7C5CFF] focus:bg-[#0E0E10] focus:outline-none"
          />

          <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7C5CFF]" />
                Saving…
              </>
            )}
            {saveStatus === "saved" && !dirty && (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Saved
              </>
            )}
            {saveStatus === "error" && (
              <span className="text-rose-400">Save failed</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => useRankingStore.temporal.getState().undo()}
            className="rounded-lg border border-[#2A2A32] bg-[#0E0E10] p-2 text-zinc-300 hover:border-zinc-500"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => useRankingStore.temporal.getState().redo()}
            className="rounded-lg border border-[#2A2A32] bg-[#0E0E10] p-2 text-zinc-300 hover:border-zinc-500"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              saveNow().then(() => toast("Draft saved", "success"));
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
          >
            <Save className="h-3.5 w-3.5" /> Save as Draft
          </button>

          <button
            type="button"
            disabled={rendering}
            onClick={handleGenerate}
            className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6C49F5] disabled:opacity-50"
          >
            {rendering ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate Video Ranking
          </button>
        </div>
      </header>

      {/* Main 2-column editor layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4 min-w-0">
          <TitleEditor />
          <GeneralSettings />
          <NumberDrag />
          <PlaybackOrder />
          <ClipAccordion assetsById={assetsById} />
          <RecentlyCreated currentId={projectId ?? undefined} />
        </div>

        <div>
          <PreviewPanel assetsById={assetsById} sfxItems={sfxItems} />
        </div>
      </div>
    </div>
  );
};

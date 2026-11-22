import { create } from "zustand";
import { temporal } from "zundo";
import {
  defaultClip,
  defaultProject,
  type Clip,
  type RankingProject,
} from "@rankstudio/composition";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface RankingStoreState {
  projectId: string | null;
  projectName: string;
  project: RankingProject;
  activeClipId: string | null;
  dragTarget: "none" | "title" | "numbers" | "video";
  saveStatus: SaveStatus;
  dirty: boolean;

  hydrate: (id: string, name: string, project: RankingProject) => void;
  setProjectName: (name: string) => void;
  updateProject: (updater: (prev: RankingProject) => RankingProject) => void;
  updateClip: (clipId: string, updater: (prev: Clip) => Clip) => void;
  addClip: () => void;
  deleteClip: (clipId: string) => void;
  moveClip: (clipId: string, direction: "up" | "down") => void;
  setActiveClipId: (id: string | null) => void;
  setDragTarget: (target: "none" | "title" | "numbers" | "video") => void;
  setSaveStatus: (status: SaveStatus) => void;
  markClean: () => void;
}

export const useRankingStore = create<RankingStoreState>()(
  temporal(
    (set) => ({
      projectId: null,
      projectName: "Untitled Video Ranking",
      project: defaultProject(),
      activeClipId: "clip-1",
      dragTarget: "none",
      saveStatus: "idle",
      dirty: false,

      hydrate: (id, name, project) =>
        set({
          projectId: id,
          projectName: name,
          project,
          activeClipId: project.clips[0]?.id ?? null,
          saveStatus: "saved",
          dirty: false,
        }),

      setProjectName: (name) =>
        set({ projectName: name, dirty: true, saveStatus: "idle" }),

      updateProject: (updater) =>
        set((state) => ({
          project: updater(state.project),
          dirty: true,
          saveStatus: "idle",
        })),

      updateClip: (clipId, updater) =>
        set((state) => ({
          project: {
            ...state.project,
            clips: state.project.clips.map((c) => (c.id === clipId ? updater(c) : c)),
          },
          dirty: true,
          saveStatus: "idle",
        })),

      addClip: () =>
        set((state) => {
          const nextRank = state.project.clips.length + 1;
          const clip = defaultClip(nextRank);
          const nextClips = [...state.project.clips, clip];
          const nextOrder = state.project.playback.order.includes(clip.id)
            ? state.project.playback.order
            : [clip.id, ...state.project.playback.order];
          return {
            project: {
              ...state.project,
              clips: nextClips,
              playback: { ...state.project.playback, order: nextOrder },
            },
            activeClipId: clip.id,
            dirty: true,
            saveStatus: "idle",
          };
        }),

      deleteClip: (clipId) =>
        set((state) => {
          if (state.project.clips.length <= 1) return state;
          const remaining = state.project.clips
            .filter((c) => c.id !== clipId)
            .map((c, idx) => ({ ...c, rank: idx + 1 }));
          const nextOrder = state.project.playback.order.filter((id) => id !== clipId);
          return {
            project: {
              ...state.project,
              clips: remaining,
              playback: { ...state.project.playback, order: nextOrder },
            },
            activeClipId:
              state.activeClipId === clipId
                ? (remaining[0]?.id ?? null)
                : state.activeClipId,
            dirty: true,
            saveStatus: "idle",
          };
        }),

      moveClip: (clipId, direction) =>
        set((state) => {
          const idx = state.project.clips.findIndex((c) => c.id === clipId);
          if (idx === -1) return state;
          const targetIdx = direction === "up" ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= state.project.clips.length) return state;
          const copy = [...state.project.clips];
          [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
          const reranked = copy.map((c, i) => ({ ...c, rank: i + 1 }));
          return {
            project: { ...state.project, clips: reranked },
            dirty: true,
            saveStatus: "idle",
          };
        }),

      setActiveClipId: (id) => set({ activeClipId: id }),
      setDragTarget: (dragTarget) => set({ dragTarget }),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      markClean: () => set({ dirty: false, saveStatus: "saved" }),
    }),
    {
      limit: 50,
      partialize: (state) => ({
        project: state.project,
        projectName: state.projectName,
      }),
    }
  )
);

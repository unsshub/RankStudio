import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Edit3,
  Eye,
  Copy,
  Trash2,
  MoreVertical,
  Play,
  RefreshCw,
  X,
  Film,
  Image as ImageIcon,
  Mic,
} from "lucide-react";
import type { AssetRecord, ProjectRecord } from "@rankstudio/shared";
import { engineFetch } from "../../lib/engine";
import { buildDownloadUrl, buildFileUrl } from "../../lib/fileUrl";
import { useToast } from "../../components/Toast";

type LibraryTab = "videos" | "images" | "voices";

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<LibraryTab>("videos");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewingProject, setViewingProject] = useState<ProjectRecord | null>(null);

  const filter = searchParams.get("filter") || "all";

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", filter],
    queryFn: () =>
      engineFetch<ProjectRecord[]>(
        filter === "all" ? "/projects" : `/projects?tool=${encodeURIComponent(filter)}`
      ),
    refetchInterval: 3000,
  });

  const { data: voices = [] } = useQuery({
    queryKey: ["assets", "VOICE"],
    queryFn: () => engineFetch<AssetRecord[]>("/assets?kind=VOICE"),
    enabled: tab === "voices",
  });

  const handleReuseTemplate = async (project: ProjectRecord) => {
    setOpenMenuId(null);
    try {
      const dup = await engineFetch<ProjectRecord>(
        `/projects/${project.id}/duplicate?template=1`,
        { method: "POST" }
      );
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast("Template duplicated as new draft", "success");
      navigate(`/video-ranking/${dup.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to duplicate", "error");
    }
  };

  const handleDelete = async (project: ProjectRecord) => {
    setOpenMenuId(null);
    if (!window.confirm(`Delete "${project.name}" and its rendered files?`)) return;
    try {
      await engineFetch(`/projects/${project.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast("Project deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  };

  const handleRetryRender = async (project: ProjectRecord) => {
    try {
      await engineFetch(`/projects/${project.id}/render`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast("Render restarted", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Retry failed", "error");
    }
  };

  const handleCancelRender = async (project: ProjectRecord) => {
    try {
      await engineFetch(`/projects/${project.id}/render/cancel`, { method: "POST" });
      toast("Render cancellation requested", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Cancel failed", "error");
    }
  };

  const completedWithThumbs = projects.filter((p) => p.thumbPath);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <p className="text-sm text-zinc-400">
            Manage drafts, live renders, thumbnails, and voiceovers.
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "all") {
              searchParams.delete("filter");
            } else {
              searchParams.set("filter", val);
            }
            setSearchParams(searchParams);
          }}
          className="rounded-lg border border-[#2A2A32] bg-[#17171B] px-3 py-2 text-xs text-zinc-200"
        >
          <option value="all">All Tools</option>
          <option value="video-ranking">Video Ranking</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#2A2A32] pb-2">
        {(
          [
            { id: "videos", label: "Videos", icon: Film },
            { id: "images", label: "Image", icon: ImageIcon },
            { id: "voices", label: "Voices", icon: Mic },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === id
                ? "bg-[#7C5CFF] text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Videos Tab */}
      {tab === "videos" && (
        <>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Loading library…
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2A2A32] bg-[#17171B] p-12 text-center">
              <p className="text-sm text-zinc-400">No projects yet.</p>
              <button
                type="button"
                onClick={() => navigate("/video-ranking-new")}
                className="mt-3 rounded-lg bg-[#7C5CFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#6C49F5]"
              >
                Create Video Ranking
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((p) => {
                const thumbUrl = buildFileUrl(p.thumbPath);
                const pct = Math.round((p.progress || 0) * 100);
                return (
                  <div
                    key={p.id}
                    className="relative flex flex-col rounded-xl border border-[#2A2A32] bg-[#17171B] overflow-hidden"
                  >
                    {/* Preview Area */}
                    <div className="relative aspect-[9/12] bg-[#0E0E10] flex items-center justify-center">
                      {p.status === "COMPLETED" && thumbUrl ? (
                        <>
                          <img
                            src={thumbUrl}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setViewingProject(p)}
                            className="absolute flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white hover:bg-[#7C5CFF] transition-colors"
                            title="Play video"
                          >
                            <Play className="h-5 w-5 fill-current" />
                          </button>
                        </>
                      ) : p.status === "RENDERING" ? (
                        <div className="w-full px-6 text-center space-y-2">
                          <div className="text-xs font-medium text-[#7C5CFF]">
                            Rendering… {pct}%
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full bg-[#7C5CFF] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelRender(p)}
                            className="text-[11px] text-zinc-400 hover:text-rose-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : p.status === "FAILED" ? (
                        <div className="px-4 text-center space-y-2">
                          <div className="text-xs font-medium text-rose-400">
                            Render Failed
                          </div>
                          {p.error && (
                            <p className="text-[11px] text-zinc-500 line-clamp-3">
                              {p.error}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRetryRender(p)}
                            className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                          >
                            <RefreshCw className="h-3 w-3" /> Retry
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">Draft</div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {p.status} · {new Date(p.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          aria-label={`Actions for ${p.name}`}
                          onClick={() =>
                            setOpenMenuId(openMenuId === p.id ? null : p.id)
                          }
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openMenuId === p.id && (
                          <div className="absolute bottom-full right-0 z-30 mb-1 w-44 rounded-lg border border-[#2A2A32] bg-[#1F1F25] py-1 text-xs shadow-2xl">
                            {p.status === "COMPLETED" && (
                              <>
                                <a
                                  href={buildDownloadUrl(p.id)}
                                  download
                                  onClick={() => setOpenMenuId(null)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
                                >
                                  <Download className="h-3.5 w-3.5" /> Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setViewingProject(p);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/video-ranking/${p.id}`);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReuseTemplate(p)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800"
                            >
                              <Copy className="h-3.5 w-3.5" /> Re-use Template
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/15"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Image Tab (render thumbnails) */}
      {tab === "images" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {completedWithThumbs.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-zinc-500">
              No render thumbnails yet.
            </div>
          ) : (
            completedWithThumbs.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-[#2A2A32] bg-[#17171B]"
              >
                <img
                  src={buildFileUrl(p.thumbPath)}
                  alt={p.name}
                  className="aspect-[9/16] w-full object-cover"
                />
                <div className="truncate p-2 text-xs text-zinc-300">{p.name}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Voices Tab */}
      {tab === "voices" && (
        <div className="space-y-2">
          {voices.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              No voice assets uploaded or generated yet.
            </div>
          ) : (
            voices.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A2A32] bg-[#17171B] px-4 py-3 text-xs"
              >
                <div>
                  <div className="font-medium text-white">{v.origName}</div>
                  <div className="text-zinc-500">
                    {v.durationSec ? `${v.durationSec.toFixed(1)}s` : v.status}
                  </div>
                </div>
                {v.status === "READY" && (
                  <audio controls src={buildFileUrl(v.path)} className="h-8" />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* View Modal */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A32] bg-[#17171B] p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white truncate">
                {viewingProject.name}
              </h3>
              <button
                type="button"
                onClick={() => setViewingProject(null)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <video
              controls
              autoPlay
              src={buildFileUrl(viewingProject.outputPath)}
              className="aspect-[9/16] max-h-[70vh] w-full rounded-xl bg-black"
            />
            <div className="flex justify-end">
              <a
                href={buildDownloadUrl(viewingProject.id)}
                download
                className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#6C49F5]"
              >
                <Download className="h-3.5 w-3.5" /> Download MP4
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

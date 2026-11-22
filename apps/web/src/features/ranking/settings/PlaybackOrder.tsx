import React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RefreshCw, Shuffle } from "lucide-react";
import { getOrderStatus, resolveOrder, syncAllOrder } from "@rankstudio/composition";
import { useRankingStore } from "../store";

const SortableOrderItem: React.FC<{ id: string; rank: number; label: string }> = ({
  id,
  rank,
  label,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-center gap-2 rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-2.5 py-1.5 text-xs text-zinc-200"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-zinc-500 hover:text-zinc-300"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="font-bold text-[#7C5CFF]">#{rank}</span>
      <span className="truncate">{label || `Clip #${rank}`}</span>
    </div>
  );
};

export const PlaybackOrder: React.FC = () => {
  const project = useRankingStore((s) => s.project);
  const updateProject = useRankingStore((s) => s.updateProject);
  const sensors = useSensors(useSensor(PointerSensor));

  const status = getOrderStatus(project);
  const orderedClips = resolveOrder(project);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = orderedClips.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const nextOrder = arrayMove(ids, oldIndex, newIndex);
    updateProject((prev) => ({
      ...prev,
      playback: { ...prev.playback, custom: true, mode: "manual", order: nextOrder },
    }));
  };

  return (
    <section className="rounded-xl border border-[#2A2A32] bg-[#17171B] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Playback Order</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              status.allInOrder
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateProject((prev) => syncAllOrder(prev))}
            className="flex items-center gap-1 rounded-md border border-[#2A2A32] bg-[#0E0E10] px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-600"
          >
            <RefreshCw className="h-3 w-3" /> Sync All
          </button>

          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={project.playback.custom}
              onChange={(e) =>
                updateProject((prev) => ({
                  ...prev,
                  playback: { ...prev.playback, custom: e.target.checked },
                }))
              }
              className="h-3.5 w-3.5 accent-[#7C5CFF]"
            />
            Custom
          </label>
        </div>
      </div>

      {!project.playback.custom ? (
        <p className="text-xs text-zinc-400">
          Default countdown order: playing #{project.clips.length} down to #1.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateProject((prev) => ({
                  ...prev,
                  playback: { ...prev.playback, mode: "manual" },
                }))
              }
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                project.playback.mode === "manual"
                  ? "bg-[#7C5CFF] text-white"
                  : "border border-[#2A2A32] bg-[#0E0E10] text-zinc-400"
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() =>
                updateProject((prev) => ({
                  ...prev,
                  playback: { ...prev.playback, mode: "shuffle" },
                }))
              }
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                project.playback.mode === "shuffle"
                  ? "bg-[#7C5CFF] text-white"
                  : "border border-[#2A2A32] bg-[#0E0E10] text-zinc-400"
              }`}
            >
              Shuffle
            </button>

            {project.playback.mode === "shuffle" && (
              <button
                type="button"
                onClick={() =>
                  updateProject((prev) => ({
                    ...prev,
                    playback: {
                      ...prev.playback,
                      seed: Math.floor(Math.random() * 100000),
                    },
                  }))
                }
                className="flex items-center gap-1 rounded-md border border-[#2A2A32] bg-[#0E0E10] px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-600"
              >
                <Shuffle className="h-3 w-3" /> Reshuffle (seed {project.playback.seed})
              </button>
            )}
          </div>

          {project.playback.mode === "manual" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedClips.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {orderedClips.map((c) => (
                    <SortableOrderItem
                      key={c.id}
                      id={c.id}
                      rank={c.rank}
                      label={c.title.text}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {orderedClips.map((c, idx) => (
                <span
                  key={c.id}
                  className="rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-zinc-300"
                >
                  {idx + 1}. Rank #{c.rank}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

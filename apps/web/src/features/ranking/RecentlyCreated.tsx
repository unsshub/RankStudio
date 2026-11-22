import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import type { ProjectRecord } from "@rankstudio/shared";
import { engineFetch } from "../../lib/engine";

export const RecentlyCreated: React.FC<{ currentId?: string }> = ({ currentId }) => {
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "video-ranking"],
    queryFn: () => engineFetch<ProjectRecord[]>("/projects?tool=video-ranking"),
  });

  const recent = projects.filter((p) => p.id !== currentId).slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <section className="rounded-xl border border-[#2A2A32] bg-[#17171B] p-4 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Clock className="h-3.5 w-3.5" /> Recently Created
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {recent.map((p) => (
          <Link
            key={p.id}
            to={`/video-ranking/${p.id}`}
            className="flex items-center justify-between rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-xs hover:border-[#7C5CFF] transition-colors"
          >
            <span className="truncate font-medium text-zinc-200">{p.name}</span>
            <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {p.status}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

import type { Clip, RankingProject } from "../schema.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function resolveOrder(project: RankingProject): Clip[] {
  const byRankDesc = [...project.clips].sort((a, b) => b.rank - a.rank);

  if (!project.playback.custom) {
    return byRankDesc;
  }

  if (project.playback.mode === "shuffle") {
    const arr = [...byRankDesc];
    const rand = mulberry32(project.playback.seed);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // manual mode: follow playback.order for valid IDs, falling back to countdown if empty
  const byId = new Map(project.clips.map((c) => [c.id, c]));
  const ordered: Clip[] = [];
  const seen = new Set<string>();
  for (const id of project.playback.order) {
    const clip = byId.get(id);
    if (clip && !seen.has(id)) {
      ordered.push(clip);
      seen.add(id);
    }
  }
  return ordered.length > 0 ? ordered : byRankDesc;
}

export interface OrderStatus {
  allInOrder: boolean;
  missingCount: number;
  label: string;
}

export function getOrderStatus(project: RankingProject): OrderStatus {
  const total = project.clips.length;
  if (!project.playback.custom || project.playback.mode === "shuffle") {
    return {
      allInOrder: true,
      missingCount: 0,
      label: `All ${total} clips in order`,
    };
  }
  const orderSet = new Set(project.playback.order);
  const missingCount = project.clips.filter((c) => !orderSet.has(c.id)).length;
  if (missingCount === 0) {
    return {
      allInOrder: true,
      missingCount: 0,
      label: `All ${total} clips in order`,
    };
  }
  return {
    allInOrder: false,
    missingCount,
    label: `${missingCount} ${missingCount === 1 ? "clip" : "clips"} missing from order`,
  };
}

export function syncAllOrder(project: RankingProject): RankingProject {
  const countdownIds = [...project.clips]
    .sort((a, b) => b.rank - a.rank)
    .map((c) => c.id);
  return {
    ...project,
    playback: {
      ...project.playback,
      order: countdownIds,
    },
  };
}

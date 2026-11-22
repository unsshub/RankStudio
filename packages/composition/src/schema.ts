import { z } from "zod";

export const TextStyle = z.object({
  fontFamily: z.string().default("Archivo Black"),
  fontSize: z.number().default(28),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  color: z.string().default("#FFFFFF"),
  highlight: z.string().nullable().default(null),
  strokeColor: z.string().default("#000000"),
  strokeWidth: z.number().min(0).max(20).default(0),
});
export type TextStyle = z.infer<typeof TextStyle>;

export const TextAnimationType = z.enum([
  "none",
  "fadeIn",
  "fadeInRight",
  "fadeInLeft",
  "fadeInUp",
  "fadeInDown",
  "zoomIn",
  "bounceIn",
  "typewriter",
]);
export type TextAnimationType = z.infer<typeof TextAnimationType>;

export const TransitionType = z.enum([
  "none",
  "fade",
  "slide",
  "wipe",
  "flip",
  "clockWipe",
]);
export type TransitionType = z.infer<typeof TransitionType>;

export const Clip = z.object({
  id: z.string(),
  rank: z.number(),
  media: z.object({
    assetId: z.string().nullable().default(null),
    durationSec: z.number().nullable().default(null),
    width: z.number().nullable().default(null),
    height: z.number().nullable().default(null),
  }),
  trim: z.object({
    startSec: z.number().default(0),
    endSec: z.number().default(3),
  }),
  volume: z.number().min(0).max(1).default(1),
  title: z.object({
    text: z.string().default(""),
    style: TextStyle.default({}),
  }),
  number: z.object({
    color: z.string().default("#FFFFFF"),
    fontFamily: z.string().default("Ranking Font"),
    bold: z.boolean().default(true),
    strokeColor: z.string().default("#000000"),
    strokeWidth: z.number().min(0).max(20).default(4),
  }),
  box: z.object({
    top: z.number().default(0),
    right: z.number().default(0),
    bottom: z.number().default(0),
    left: z.number().default(0),
  }),
  voiceover: z.object({
    enabled: z.boolean().default(false),
    mode: z.enum(["manual", "upload", "ai"]).default("manual"),
    script: z.string().default(""),
    ai: z
      .object({
        topic: z.string().default(""),
        tone: z.string().default("energetic"),
        length: z.enum(["short", "medium", "long"]).default("short"),
        hook: z.string().default(""),
        cta: z.string().default(""),
      })
      .default({}),
    voiceId: z.string().nullable().default(null),
    audioAssetId: z.string().nullable().default(null),
  }),
  animation: z.object({
    text: z.object({
      type: TextAnimationType.default("fadeInRight"),
      durationSec: z.number().min(0).max(5).default(0.4),
      delaySec: z.number().min(0).max(5).default(0),
    }),
    transition: TransitionType.default("none"),
  }),
  sfx: z.object({
    id: z.string().nullable().default(null),
    volume: z.number().min(0).max(1).default(0.8),
  }),
});
export type Clip = z.infer<typeof Clip>;

export const RankingProject = z.object({
  version: z.literal(1),
  title: z.object({
    doc: z.any(),
    align: z.enum(["left", "center", "right"]).default("center"),
    position: z.object({
      x: z.number().default(50),
      y: z.number().default(2.5),
    }),
    strokeColor: z.string().default("#000000"),
    strokeWidth: z.number().min(0).max(20).default(4),
  }),
  general: z.object({
    videoHeightPct: z.number().min(30).max(100).default(88),
    background: z.string().default("#2B2A2A"),
    captions: z.boolean().default(false),
  }),
  playback: z.object({
    custom: z.boolean().default(false),
    mode: z.enum(["manual", "shuffle"]).default("manual"),
    order: z.array(z.string()).default([]),
    seed: z.number().default(1),
  }),
  numbers: z.object({
    dragEnabled: z.boolean().default(false),
    x: z.number().default(6),
    y: z.number().default(18),
    scale: z.number().min(0.3).max(3).default(1),
    gap: z.number().min(0).max(200).default(28),
  }),
  clips: z.array(Clip).min(1),
});
export type RankingProject = z.infer<typeof RankingProject>;

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#FFFFFF", "#A78BFA"];

export function defaultClip(rank: number, id?: string): Clip {
  return Clip.parse({
    id: id ?? `clip-${rank}-${Math.random().toString(36).slice(2, 8)}`,
    rank,
    media: {
      assetId: null,
      durationSec: null,
      width: null,
      height: null,
    },
    trim: { startSec: 0, endSec: 3 },
    volume: 1,
    title: {
      text: `Clip #${rank}`,
      style: {
        fontFamily: "Archivo Black",
        fontSize: 42,
        bold: true,
        italic: false,
        color: "#FFFFFF",
        highlight: null,
        strokeColor: "#000000",
        strokeWidth: 4,
      },
    },
    number: {
      color: RANK_COLORS[(rank - 1) % RANK_COLORS.length],
      fontFamily: "Ranking Font",
      bold: true,
      strokeColor: "#000000",
      strokeWidth: 4,
    },
    box: { top: 0, right: 0, bottom: 0, left: 0 },
    voiceover: {
      enabled: false,
      mode: "manual",
      script: "",
      ai: { topic: "", tone: "energetic", length: "short", hook: "", cta: "" },
      voiceId: null,
      audioAssetId: null,
    },
    animation: {
      text: { type: "fadeInRight", durationSec: 0.4, delaySec: 0 },
      transition: "none",
    },
    sfx: { id: null, volume: 0.8 },
  });
}

export function defaultTitleDoc() {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Top 3 ",
            marks: [
              {
                type: "textStyle",
                attrs: { color: "#FFFFFF", fontFamily: "Archivo Black", fontSize: "64px" },
              },
            ],
          },
          {
            type: "text",
            text: "Moments",
            marks: [
              {
                type: "textStyle",
                attrs: { color: "#7C5CFF", fontFamily: "Archivo Black", fontSize: "64px" },
              },
            ],
          },
        ],
      },
    ],
  };
}

export function defaultProject(): RankingProject {
  const clips = [defaultClip(1, "clip-1"), defaultClip(2, "clip-2"), defaultClip(3, "clip-3")];
  return RankingProject.parse({
    version: 1,
    title: {
      doc: defaultTitleDoc(),
      align: "center",
      position: { x: 50, y: 2.5 },
      strokeColor: "#000000",
      strokeWidth: 4,
    },
    general: {
      videoHeightPct: 88,
      background: "#2B2A2A",
      captions: false,
    },
    playback: {
      custom: false,
      mode: "manual",
      order: clips.map((c) => c.id).reverse(),
      seed: 1,
    },
    numbers: {
      dragEnabled: false,
      x: 6,
      y: 18,
      scale: 1,
      gap: 28,
    },
    clips,
  });
}

export function migrate(raw: unknown): RankingProject {
  const base = defaultProject();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const obj = raw as Record<string, unknown>;
  const merged = {
    version: 1 as const,
    title: {
      ...base.title,
      ...(typeof obj.title === "object" && obj.title ? (obj.title as Record<string, unknown>) : {}),
    },
    general: {
      ...base.general,
      ...(typeof obj.general === "object" && obj.general
        ? (obj.general as Record<string, unknown>)
        : {}),
    },
    playback: {
      ...base.playback,
      ...(typeof obj.playback === "object" && obj.playback
        ? (obj.playback as Record<string, unknown>)
        : {}),
    },
    numbers: {
      ...base.numbers,
      ...(typeof obj.numbers === "object" && obj.numbers
        ? (obj.numbers as Record<string, unknown>)
        : {}),
    },
    clips: Array.isArray(obj.clips) && obj.clips.length > 0 ? obj.clips : base.clips,
  };
  return RankingProject.parse(merged);
}

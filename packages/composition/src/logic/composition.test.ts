import { describe, it, expect } from "vitest";
import {
  RankingProject,
  defaultProject,
  defaultClip,
  migrate,
} from "../schema.js";
import { resolveOrder, getOrderStatus, syncAllOrder } from "./order.js";
import { computeClipDurationSec, computeDurationSec, computeDurationFrames } from "./duration.js";
import { tiptapToSpans } from "./tiptapToSpans.js";
import { buildCaptionChunks } from "./captions.js";

describe("Composition public contract", () => {
  describe("schema, defaults & migrate", () => {
    it("creates a valid default project with at least one clip and expected defaults", () => {
      const project = defaultProject();
      const parsed = RankingProject.parse(project);
      expect(parsed.version).toBe(1);
      expect(parsed.general.videoHeightPct).toBe(80);
      expect(parsed.general.background).toBe("#2B2A2A");
      expect(parsed.general.captions).toBe(false);
      expect(parsed.clips.length).toBeGreaterThanOrEqual(1);
    });

    it("migrates legacy or partial project payloads safely into a valid v1 project", () => {
      const raw = {
        version: 1,
        clips: [defaultClip(1)],
      };
      const migrated = migrate(raw);
      expect(migrated.version).toBe(1);
      expect(migrated.general.background).toBe("#2B2A2A");
      expect(migrated.clips).toHaveLength(1);
    });
  });

  describe("resolveOrder", () => {
    function make4ClipProject() {
      const p = defaultProject();
      p.clips = [defaultClip(1), defaultClip(2), defaultClip(3), defaultClip(4)];
      p.clips[0].id = "c1";
      p.clips[1].id = "c2";
      p.clips[2].id = "c3";
      p.clips[3].id = "c4";
      return p;
    }

    it("defaults to countdown N -> 1 when custom playback is off", () => {
      const p = make4ClipProject();
      p.playback.custom = false;
      expect(resolveOrder(p).map((c) => c.id)).toEqual(["c4", "c3", "c2", "c1"]);
    });

    it("respects manual playback.order when custom=true and mode=manual", () => {
      const p = make4ClipProject();
      p.playback.custom = true;
      p.playback.mode = "manual";
      p.playback.order = ["c2", "c4", "c1", "c3"];
      expect(resolveOrder(p).map((c) => c.id)).toEqual(["c2", "c4", "c1", "c3"]);
    });

    it("produces deterministic shuffle order from playback.seed", () => {
      const p1 = make4ClipProject();
      p1.playback.custom = true;
      p1.playback.mode = "shuffle";
      p1.playback.seed = 42;

      const p2 = make4ClipProject();
      p2.playback.custom = true;
      p2.playback.mode = "shuffle";
      p2.playback.seed = 42;

      const r1 = resolveOrder(p1).map((c) => c.id);
      const r2 = resolveOrder(p2).map((c) => c.id);
      expect(r1).toEqual(r2);
      expect(new Set(r1)).toEqual(new Set(["c1", "c2", "c3", "c4"]));
    });

    it("reports order status pill and resets to N -> 1 on syncAllOrder", () => {
      const p = make4ClipProject();
      p.playback.custom = true;
      p.playback.mode = "manual";
      p.playback.order = ["c4", "c2"];

      expect(getOrderStatus(p)).toEqual({
        allInOrder: false,
        missingCount: 2,
        label: "2 clips missing from order",
      });

      const synced = syncAllOrder(p);
      expect(synced.playback.order).toEqual(["c4", "c3", "c2", "c1"]);
      expect(getOrderStatus(synced)).toEqual({
        allInOrder: true,
        missingCount: 0,
        label: "All 4 clips in order",
      });
    });
  });

  describe("computeDuration", () => {
    it("enforces minimum clip length of 0.5s and holds last frame when voiceover is longer", () => {
      const clip = defaultClip(1);
      clip.trim = { startSec: 0, endSec: 0.2 };
      expect(computeClipDurationSec(clip)).toBe(0.5);

      clip.trim = { startSec: 1, endSec: 4 };
      expect(computeClipDurationSec(clip)).toBe(3);

      clip.voiceover.enabled = true;
      clip.voiceover.audioAssetId = "v1";
      expect(computeClipDurationSec(clip, 5.5)).toBe(5.5);
      expect(computeClipDurationSec(clip, 2.0)).toBe(3);
    });

    it("subtracts 0.5s per active transition overlap across clips", () => {
      const p = defaultProject();
      const c1 = defaultClip(1);
      c1.id = "c1";
      c1.trim = { startSec: 0, endSec: 3 };
      c1.animation.transition = "fade";

      const c2 = defaultClip(2);
      c2.id = "c2";
      c2.trim = { startSec: 0, endSec: 4 };
      c2.animation.transition = "slide";

      const c3 = defaultClip(3);
      c3.id = "c3";
      c3.trim = { startSec: 0, endSec: 2 };
      c3.animation.transition = "none";

      p.clips = [c1, c2, c3];
      p.playback.custom = true;
      p.playback.mode = "manual";
      p.playback.order = ["c1", "c2", "c3"];

      // c1->c2 uses c2 transition ("slide" -> -0.5s), c2->c3 uses c3 transition ("none" -> 0s)
      // Total = 3 + 4 + 2 - 0.5 = 8.5s -> 255 frames @ 30fps
      expect(computeDurationSec(p)).toBeCloseTo(8.5, 5);
      expect(computeDurationFrames(p)).toBe(255);
    });
  });

  describe("tiptapToSpans", () => {
    it("extracts per-word marks (bold, italic, color, highlight, fontFamily, fontSize) into spans", () => {
      const doc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Top " },
              {
                type: "text",
                text: "5",
                marks: [
                  { type: "bold" },
                  { type: "textStyle", attrs: { color: "#FF0000", fontFamily: "Anton", fontSize: "56px" } },
                  { type: "highlight", attrs: { color: "#FFFF00" } },
                ],
              },
              { type: "text", text: " Moments", marks: [{ type: "italic" }] },
            ],
          },
        ],
      };

      const lines = tiptapToSpans(doc);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toHaveLength(3);
      expect(lines[0][1]).toMatchObject({
        text: "5",
        bold: true,
        color: "#FF0000",
        fontFamily: "Anton",
        fontSize: 56,
        highlight: "#FFFF00",
      });
      expect(lines[0][2]).toMatchObject({
        text: " Moments",
        italic: true,
      });
    });
  });

  describe("buildCaptionChunks", () => {
    it("splits script into 3-word chunks spread evenly across voice duration", () => {
      const chunks = buildCaptionChunks("one two three four five six seven", 3.0);
      expect(chunks).toHaveLength(3);
      expect(chunks[0].text).toBe("one two three");
      expect(chunks[1].text).toBe("four five six");
      expect(chunks[2].text).toBe("seven");
      expect(chunks[0].startSec).toBeCloseTo(0, 5);
      expect(chunks[2].endSec).toBeCloseTo(3.0, 5);
    });

    it("returns empty array for blank script or non-positive duration", () => {
      expect(buildCaptionChunks("   ", 5)).toEqual([]);
      expect(buildCaptionChunks("hello world", 0)).toEqual([]);
    });
  });
});

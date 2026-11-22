import React from "react";
import type { Clip, TextAnimationType, TransitionType } from "@rankstudio/composition";

const TEXT_ANIMS: TextAnimationType[] = [
  "none",
  "fadeIn",
  "fadeInRight",
  "fadeInLeft",
  "fadeInUp",
  "fadeInDown",
  "zoomIn",
  "bounceIn",
  "typewriter",
];

const TRANSITIONS: TransitionType[] = [
  "none",
  "fade",
  "slide",
  "wipe",
  "flip",
  "clockWipe",
];

interface AnimationTabProps {
  clip: Clip;
  onChange: (updater: (prev: Clip) => Clip) => void;
}

export const AnimationTab: React.FC<AnimationTabProps> = ({ clip, onChange }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
      <div className="space-y-2">
        <label className="block space-y-1 text-zinc-400">
          <span>Text Entrance Animation</span>
          <select
            value={clip.animation.text.type}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                animation: {
                  ...prev.animation,
                  text: {
                    ...prev.animation.text,
                    type: e.target.value as TextAnimationType,
                  },
                },
              }))
            }
            className="w-full rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1.5 text-white"
          >
            {TEXT_ANIMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-zinc-400">
            <span>Duration (s)</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={clip.animation.text.durationSec}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  animation: {
                    ...prev.animation,
                    text: {
                      ...prev.animation.text,
                      durationSec: Number(e.target.value) || 0,
                    },
                  },
                }))
              }
              className="w-full rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
            />
          </label>
          <label className="space-y-1 text-zinc-400">
            <span>Delay (s)</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={clip.animation.text.delaySec}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  animation: {
                    ...prev.animation,
                    text: {
                      ...prev.animation.text,
                      delaySec: Number(e.target.value) || 0,
                    },
                  },
                }))
              }
              className="w-full rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
            />
          </label>
        </div>
      </div>

      <label className="block space-y-1 text-zinc-400">
        <span>Clip Transition (0.5s overlap)</span>
        <select
          value={clip.animation.transition}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              animation: {
                ...prev.animation,
                transition: e.target.value as TransitionType,
              },
            }))
          }
          className="w-full rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1.5 text-white"
        >
          {TRANSITIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

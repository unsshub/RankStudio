import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Sparkles, Upload, Trash2 } from "lucide-react";
import type { Clip } from "@rankstudio/composition";
import type { AiScriptResponse, AiVoiceResponse } from "@rankstudio/shared";
import { engineFetch, uploadAssetWithProgress } from "../../../../lib/engine";
import { useEngineHealth } from "../../../../components/EngineGate";
import { useToast } from "../../../../components/Toast";

const GEMINI_VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Aoede"];

interface VoiceoverTabProps {
  clip: Clip;
  onChange: (updater: (prev: Clip) => Clip) => void;
}

export const VoiceoverTab: React.FC<VoiceoverTabProps> = ({ clip, onChange }) => {
  const health = useEngineHealth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const geminiAvailable = Boolean(health?.gemini);
  const vo = clip.voiceover;

  const updateVo = (patch: Partial<Clip["voiceover"]>) =>
    onChange((prev) => ({
      ...prev,
      voiceover: { ...prev.voiceover, ...patch },
    }));

  const handleVoiceUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      setBusy(true);
      const asset = await uploadAssetWithProgress(file, "VOICE");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      updateVo({ enabled: true, mode: "upload", audioAssetId: asset.id });
      toast("Voice audio uploaded", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Voice upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!vo.ai.topic.trim()) {
      toast("Enter a topic first", "error");
      return;
    }
    try {
      setBusy(true);
      const res = await engineFetch<AiScriptResponse>("/ai/script", {
        method: "POST",
        body: JSON.stringify(vo.ai),
      });
      updateVo({ script: res.script, enabled: true });
      toast("AI script generated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Script generation failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!vo.script.trim()) {
      toast("Write or generate a script first", "error");
      return;
    }
    try {
      setBusy(true);
      const res = await engineFetch<AiVoiceResponse>("/ai/voice", {
        method: "POST",
        body: JSON.stringify({
          script: vo.script,
          voiceId: vo.voiceId || "Kore",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      updateVo({ enabled: true, mode: "ai", audioAssetId: res.assetId });
      toast("AI voiceover queued", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "TTS generation failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
          <input
            type="checkbox"
            checked={vo.enabled}
            onChange={(e) => updateVo({ enabled: e.target.checked })}
            className="h-3.5 w-3.5 accent-[#7C5CFF]"
          />
          <Mic className="h-3.5 w-3.5 text-[#7C5CFF]" />
          Enable Voiceover
        </label>

        {geminiAvailable && (
          <div className="flex gap-1">
            {(["manual", "ai"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateVo({ mode: m })}
                className={`rounded px-2 py-0.5 capitalize ${
                  (m === "ai" ? vo.mode === "ai" : vo.mode !== "ai")
                    ? "bg-[#7C5CFF] text-white"
                    : "border border-[#2A2A32] text-zinc-400"
                }`}
              >
                {m === "ai" ? "Gemini AI" : "Manual / Upload"}
              </button>
            ))}
          </div>
        )}
      </div>

      {vo.enabled && (
        <>
          {geminiAvailable && vo.mode === "ai" && (
            <div className="space-y-2 rounded-lg border border-[#2A2A32] bg-[#121216] p-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Topic"
                  value={vo.ai.topic}
                  onChange={(e) =>
                    updateVo({ ai: { ...vo.ai, topic: e.target.value } })
                  }
                  className="rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
                />
                <input
                  type="text"
                  placeholder="Tone (e.g. energetic)"
                  value={vo.ai.tone}
                  onChange={(e) =>
                    updateVo({ ai: { ...vo.ai, tone: e.target.value } })
                  }
                  className="rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
                />
                <input
                  type="text"
                  placeholder="Hook (optional)"
                  value={vo.ai.hook}
                  onChange={(e) =>
                    updateVo({ ai: { ...vo.ai, hook: e.target.value } })
                  }
                  className="rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
                />
                <input
                  type="text"
                  placeholder="CTA (optional)"
                  value={vo.ai.cta}
                  onChange={(e) =>
                    updateVo({ ai: { ...vo.ai, cta: e.target.value } })
                  }
                  className="rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={vo.ai.length}
                  onChange={(e) =>
                    updateVo({
                      ai: {
                        ...vo.ai,
                        length: e.target.value as "short" | "medium" | "long",
                      },
                    })
                  }
                  className="rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>

                <select
                  value={vo.voiceId || "Kore"}
                  onChange={(e) => updateVo({ voiceId: e.target.value })}
                  className="rounded border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-white"
                >
                  {GEMINI_VOICES.map((v) => (
                    <option key={v} value={v}>
                      Voice: {v}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGenerateScript}
                  className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" /> Generate Script
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGenerateVoice}
                  className="flex items-center gap-1 rounded bg-[#7C5CFF] px-2.5 py-1 text-white hover:bg-[#6C49F5] disabled:opacity-50"
                >
                  Generate Voice
                </button>
              </div>
            </div>
          )}

          <textarea
            rows={3}
            value={vo.script}
            onChange={(e) => updateVo({ script: e.target.value })}
            placeholder="Write voiceover script (also used for auto captions)…"
            className="w-full rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-xs text-white focus:border-[#7C5CFF] focus:outline-none"
          />

          <div className="flex items-center justify-between gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".mp3,.wav,.ogg,.m4a,audio/*"
              className="hidden"
              onChange={(e) => {
                handleVoiceUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-[#2A2A32] bg-[#0E0E10] px-3 py-1.5 text-zinc-200 hover:border-[#7C5CFF]"
            >
              <Upload className="h-3.5 w-3.5" />
              {vo.audioAssetId ? "Replace Voice Audio" : "Upload Voice Audio"}
            </button>

            {vo.audioAssetId && (
              <button
                type="button"
                onClick={() => updateVo({ audioAssetId: null })}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove Audio
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

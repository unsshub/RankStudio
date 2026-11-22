import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  type AssetRecord,
} from "@rankstudio/shared";
import { uploadAssetWithProgress } from "../../../lib/engine";
import { useToast } from "../../../components/Toast";

interface UploadDropzoneProps {
  clipRank: number;
  asset: AssetRecord | undefined;
  onUploaded: (asset: AssetRecord) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  clipRank,
  asset,
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!(ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
      toast("Only MP4, MOV, or WebM video files are supported", "error");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast(`File exceeds ${MAX_UPLOAD_MB} MB limit`, "error");
      return;
    }

    try {
      setUploadPct(0);
      const created = await uploadAssetWithProgress(file, "VIDEO", (pct) =>
        setUploadPct(pct)
      );
      setUploadPct(null);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      onUploaded(created);
      toast(`Uploaded clip for #${clipRank} — processing…`, "info");
    } catch (err) {
      setUploadPct(null);
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
        className="hidden"
        data-testid={`clip-upload-input-${clipRank}`}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {!asset ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#343440] bg-[#0E0E10] px-4 py-6 text-center hover:border-[#7C5CFF] transition-colors"
        >
          <Upload className="h-5 w-5 text-[#7C5CFF]" />
          <div className="text-xs font-medium text-zinc-200">
            Drop MP4 / MOV / WebM or click to upload
          </div>
          <div className="text-[11px] text-zinc-500">Max {MAX_UPLOAD_MB} MB</div>
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {asset.status === "READY" && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            {asset.status === "PENDING" && (
              <Loader2 className="h-4 w-4 animate-spin text-[#7C5CFF] shrink-0" />
            )}
            {asset.status === "FAILED" && (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <div className="truncate">
              <div className="truncate font-medium text-zinc-200">{asset.origName}</div>
              <div className="text-[11px] text-zinc-500">
                {asset.status === "READY"
                  ? `${asset.durationSec?.toFixed(1) ?? "?"}s · ${asset.width ?? "?"}×${asset.height ?? "?"}`
                  : asset.status === "FAILED"
                    ? `Failed: ${asset.error || "Ingest error"}`
                    : "Ingesting proxy, filmstrip & waveform…"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1 rounded border border-[#2A2A32] px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500 shrink-0"
          >
            <RefreshCw className="h-3 w-3" /> Re-upload
          </button>
        </div>
      )}

      {uploadPct !== null && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-[#7C5CFF] transition-all"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
          <div className="text-[11px] text-zinc-400">Uploading… {uploadPct}%</div>
        </div>
      )}
    </div>
  );
};

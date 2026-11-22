import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, KeyRound, Server } from "lucide-react";
import { getEngineUrl, getToken, setEngineUrl, setToken } from "../lib/settings";
import { useToast } from "./Toast";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  initialToken?: string;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  initialToken,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [url, setUrl] = useState(getEngineUrl());
  const [token, setTokenVal] = useState(initialToken || getToken());

  useEffect(() => {
    if (open) {
      setUrl(getEngineUrl());
      setTokenVal(initialToken || getToken());
    }
  }, [open, initialToken]);

  if (!open) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setEngineUrl(url);
    setToken(token);
    queryClient.invalidateQueries({ queryKey: ["health"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    toast("Engine settings saved", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#2A2A32] bg-[#17171B] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Engine Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Server className="h-3.5 w-3.5" /> Engine URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://127.0.0.1:4000"
              className="w-full rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-sm text-white focus:border-[#7C5CFF] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <KeyRound className="h-3.5 w-3.5" /> Pairing Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setTokenVal(e.target.value)}
              placeholder="Paste pair code from terminal"
              className="w-full rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-sm text-white focus:border-[#7C5CFF] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#2A2A32] px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#7C5CFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#6C49F5]"
            >
              Save & Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

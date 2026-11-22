import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { HealthResponse } from "@rankstudio/shared";
import { KeyRound, Terminal, WifiOff, Settings } from "lucide-react";
import { checkHealth } from "../lib/engine";
import { getEngineUrl, getToken, setToken } from "../lib/settings";
import { subscribeEngineEvents } from "../lib/events";

interface EngineStatusContextValue {
  health: HealthResponse | undefined;
}

const EngineStatusContext = createContext<EngineStatusContextValue>({
  health: undefined,
});

export const useEngineHealth = () => useContext(EngineStatusContext).health;

interface EngineGateProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
}

export const EngineGate: React.FC<EngineGateProps> = ({
  children,
  onOpenSettings,
}) => {
  const queryClient = useQueryClient();
  const [pairInput, setPairInput] = useState(getToken());

  const { data: health, isError, isLoading, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: (query) => (query.state.data?.paired ? 10000 : 2500),
    retry: false,
  });

  // Subscribe to SSE once paired
  useEffect(() => {
    if (!health?.paired) return;
    return subscribeEngineEvents((event) => {
      if (event.type === "project.progress" || event.type === "project.status") {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["project", event.projectId] });
      } else if (event.type === "asset.status") {
        queryClient.invalidateQueries({ queryKey: ["assets"] });
        queryClient.invalidateQueries({ queryKey: ["asset", event.assetId] });
      }
    });
  }, [health?.paired, queryClient]);

  const handlePairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToken(pairInput);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0E0E10] text-zinc-400">
        Connecting to RankStudio Engine…
      </div>
    );
  }

  if (isError || !health?.ok) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0E0E10] p-6">
        <div className="w-full max-w-lg rounded-2xl border border-[#2A2A32] bg-[#17171B] p-8 shadow-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <WifiOff className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Start your RankStudio Engine</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Could not reach the local engine at{" "}
            <code className="rounded bg-[#0E0E10] px-1.5 py-0.5 text-zinc-200">
              {getEngineUrl()}
            </code>
            . All media stays on your machine — start the engine in your terminal and this
            page will reconnect automatically.
          </p>

          <div className="mt-5 rounded-xl border border-[#2A2A32] bg-[#0E0E10] p-4 font-mono text-sm text-emerald-400 flex items-center gap-2.5">
            <Terminal className="h-4 w-4 shrink-0 text-zinc-500" />
            <span>npm run engine</span>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg bg-[#7C5CFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#6C49F5]"
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
            >
              <Settings className="h-4 w-4" /> Engine Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!health.paired) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0E0E10] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#2A2A32] bg-[#17171B] p-8 shadow-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#7C5CFF]">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Pair with RankStudio Engine</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Paste the <strong className="text-zinc-200">Pair code</strong> printed in your
            engine terminal to connect this browser.
          </p>

          <form onSubmit={handlePairSubmit} className="mt-5 space-y-4">
            <input
              type="password"
              value={pairInput}
              onChange={(e) => setPairInput(e.target.value)}
              placeholder="Paste pairing token..."
              aria-label="Pairing token"
              className="w-full rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3.5 py-2.5 text-sm text-white focus:border-[#7C5CFF] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#7C5CFF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6C49F5]"
            >
              Pair Browser
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <EngineStatusContext.Provider value={{ health }}>
      {children}
    </EngineStatusContext.Provider>
  );
};

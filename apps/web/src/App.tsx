import React, { useCallback, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "./components/Toast";
import { EngineGate } from "./components/EngineGate";
import { Sidebar } from "./components/Sidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { EditorPage } from "./features/ranking/EditorPage";
import { LibraryPage } from "./features/library/LibraryPage";
import {
  ComingSoonPage,
  FreeCoursePage,
  HomePage,
  NewVideoRankingRedirect,
  SettingsRoutePage,
  TutorialPage,
} from "./pages/StaticPages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialToken, setInitialToken] = useState<string | undefined>(undefined);

  const openSettings = useCallback((token?: string) => {
    setInitialToken(token);
    setSettingsOpen(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <HashRouter>
          <SettingsDialog
            open={settingsOpen}
            initialToken={initialToken}
            onClose={() => setSettingsOpen(false)}
          />

          <Routes>
            <Route
              path="/settings"
              element={<SettingsRoutePage onOpenSettings={openSettings} />}
            />
            <Route
              path="*"
              element={
                <EngineGate onOpenSettings={() => openSettings()}>
                  <div className="flex h-screen w-full overflow-hidden bg-[#0E0E10]">
                    <Sidebar onOpenSettings={() => openSettings()} />
                    <main className="flex-1 overflow-y-auto">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/library" element={<LibraryPage />} />
                        <Route path="/tutorial" element={<TutorialPage />} />
                        <Route path="/free-course" element={<FreeCoursePage />} />
                        <Route
                          path="/video-ranking-new"
                          element={<NewVideoRankingRedirect />}
                        />
                        <Route path="/video-ranking/:id" element={<EditorPage />} />
                        <Route path="/tools/:slug" element={<ComingSoonPage />} />
                      </Routes>
                    </main>
                  </div>
                </EngineGate>
              }
            />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

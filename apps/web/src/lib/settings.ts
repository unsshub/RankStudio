import { ENGINE_DEFAULT_URL } from "@rankstudio/shared";

const URL_KEY = "rankstudio.engineUrl";
const TOKEN_KEY = "rankstudio.token";
const SIDEBAR_KEY = "rankstudio.sidebarCollapsed";
const RECENT_COLORS_KEY = "rankstudio.recentColors";

export function getEngineUrl(): string {
  const envDefault =
    (import.meta.env?.VITE_DEFAULT_ENGINE_URL as string | undefined) ||
    ENGINE_DEFAULT_URL;
  return (localStorage.getItem(URL_KEY) || envDefault).replace(/\/$/, "");
}

export function setEngineUrl(url: string): void {
  const clean = url.trim().replace(/\/$/, "");
  if (clean) {
    localStorage.setItem(URL_KEY, clean);
  }
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function getSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_KEY) === "1";
}

export function setSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
}

export function getRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentColor(hex: string): string[] {
  const clean = hex.trim().toUpperCase();
  const next = [clean, ...getRecentColors().filter((c) => c !== clean)].slice(0, 10);
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
  return next;
}

import { getEngineUrl, getToken } from "./settings";

export function buildFileUrl(relPath: string | null | undefined): string | undefined {
  if (!relPath) return undefined;
  const clean = relPath.replace(/^\/+/, "");
  const encoded = clean.split("/").map(encodeURIComponent).join("/");
  const token = getToken();
  const query = token ? `?t=${encodeURIComponent(token)}` : "";
  return `${getEngineUrl()}/files/${encoded}${query}`;
}

export function buildDownloadUrl(projectId: string): string {
  const token = getToken();
  const query = token ? `?t=${encodeURIComponent(token)}` : "";
  return `${getEngineUrl()}/renders/${encodeURIComponent(projectId)}/download${query}`;
}

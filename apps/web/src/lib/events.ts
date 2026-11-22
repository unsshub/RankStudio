import type { SseEvent } from "@rankstudio/shared";
import { getEngineUrl, getToken } from "./settings";

export function subscribeEngineEvents(
  onEvent: (event: SseEvent) => void
): () => void {
  const token = getToken();
  if (!token) return () => {};

  const url = `${getEngineUrl()}/events?t=${encodeURIComponent(token)}`;
  const es = new EventSource(url);

  const handle = (ev: MessageEvent) => {
    try {
      const parsed = JSON.parse(ev.data) as SseEvent;
      onEvent(parsed);
    } catch {
      // ignore malformed event
    }
  };

  es.addEventListener("project.progress", handle);
  es.addEventListener("project.status", handle);
  es.addEventListener("asset.status", handle);

  return () => {
    es.close();
  };
}

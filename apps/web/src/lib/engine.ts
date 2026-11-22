import {
  ENGINE_TOKEN_HEADER,
  type AssetKind,
  type AssetRecord,
  type HealthResponse,
} from "@rankstudio/shared";
import { getEngineUrl, getToken } from "./settings";

export class EngineError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "EngineError";
  }
}

export async function engineFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${getEngineUrl()}${path}`;
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set(ENGINE_TOKEN_HEADER, token);
  }
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    let msg = `Engine request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // ignore json parse failure
    }
    throw new EngineError(res.status, msg);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export async function checkHealth(): Promise<HealthResponse> {
  return engineFetch<HealthResponse>("/health");
}

export function uploadAssetWithProgress(
  file: File,
  kind: AssetKind,
  onProgress?: (pct: number) => void
): Promise<AssetRecord> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${getEngineUrl()}/assets/upload?kind=${encodeURIComponent(kind)}`;
    xhr.open("POST", url, true);
    const token = getToken();
    if (token) {
      xhr.setRequestHeader(ENGINE_TOKEN_HEADER, token);
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as AssetRecord);
        } catch {
          reject(new Error("Invalid upload response"));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          // ignore
        }
        reject(new EngineError(xhr.status, msg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    xhr.send(form);
  });
}

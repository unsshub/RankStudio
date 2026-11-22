import type { ServerResponse } from "node:http";
import type { SseEvent } from "@rankstudio/shared";

export class SseHub {
  private clients = new Set<ServerResponse>();

  add(res: ServerResponse): void {
    this.clients.add(res);
    res.on("close", () => {
      this.clients.delete(res);
    });
  }

  emit(event: SseEvent): void {
    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const res of this.clients) {
      if (!res.writableEnded) {
        res.write(payload);
      } else {
        this.clients.delete(res);
      }
    }
  }

  closeAll(): void {
    for (const res of this.clients) {
      if (!res.writableEnded) {
        res.end();
      }
    }
    this.clients.clear();
  }
}

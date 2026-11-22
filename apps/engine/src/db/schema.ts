import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  tool: text("tool").notNull().default("video-ranking"),
  name: text("name").notNull(),
  data: text("data", { mode: "json" }).notNull(),
  status: text("status").notNull().default("DRAFT"),
  progress: real("progress").notNull().default(0),
  outputPath: text("output_path"),
  thumbPath: text("thumb_path"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  path: text("path").notNull(),
  origName: text("orig_name").notNull(),
  durationSec: real("duration_sec"),
  width: integer("width"),
  height: integer("height"),
  filmstrip: text("filmstrip"),
  waveform: text("waveform"),
  status: text("status").notNull().default("PENDING"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  status: text("status").notNull().default("QUEUED"),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

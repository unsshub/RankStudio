import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export interface DbContext {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
  close: () => void;
}

export function createDb(dataDir: string): DbContext {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "rankstudio.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      tool TEXT NOT NULL DEFAULT 'video-ranking',
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      progress REAL NOT NULL DEFAULT 0,
      output_path TEXT,
      thumb_path TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      orig_name TEXT NOT NULL,
      duration_sec REAL,
      width INTEGER,
      height INTEGER,
      filmstrip TEXT,
      waveform TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      attempts INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const db = drizzle(sqlite, { schema });
  return {
    sqlite,
    db,
    close: () => sqlite.close(),
  };
}

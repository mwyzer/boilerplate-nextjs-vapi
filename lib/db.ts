import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDb>;
};

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  return raw.replace(/^file:/, "");
}

function createDb() {
  const sqlite = new Database(resolveDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

export const db: Db =
  globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
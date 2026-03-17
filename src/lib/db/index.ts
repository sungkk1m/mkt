import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url || url === "여기에_DB_URL_입력") {
    // Return a dummy connection for build time; will fail at runtime if not configured
    const client = createClient({ url: "file:local.db" });
    return drizzle(client, { schema });
  }
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

// Singleton pattern to prevent connection leaks during Next.js HMR
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

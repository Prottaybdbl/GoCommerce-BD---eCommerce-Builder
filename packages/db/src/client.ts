import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Apps run from `apps/<name>`, but in local development the one `.env` lives at
// the repo root. Without this the storefront booted with none of it — notably
// not the secret that verifies theme draft-preview tokens signed by the API.
// Never overrides a variable that is already set (containers set them all).
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://gocom_user:gocom_local_secret@127.0.0.1:5432/gocom_db";

// Use a controlled connection pool appropriate for 4 GB server (max 10-15 per container)
const queryClient = postgres(connectionString, {
  max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
export { queryClient };

export async function closeDatabase(): Promise<void> {
  try {
    await queryClient.end({ timeout: 0 });
  } catch {
    // Ignore errors during close
  }
}

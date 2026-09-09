import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { readFileSync } from "fs";
import type { DB } from "./types.js";
import { metrics } from "../plugins/metrics.js";

function getEnv(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val === undefined || val === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function getEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined || val === "") return fallback;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer for ${key}: ${val}`);
  return parsed;
}

const databaseUrl = getEnv("DATABASE_URL");
const maxConnections = getEnvInt("MAX_DB_CONNECTIONS", 10);
const sslMode = getEnv("DATABASE_SSL_MODE", "disable");

const sslConfig =
  sslMode === "disable"
    ? undefined
    : {
        ssl: {
          rejectUnauthorized: sslMode === "verify-full",
          ca: process.env.DATABASE_SSL_CA
            ? readFileSync(process.env.DATABASE_SSL_CA, "utf-8")
            : undefined,
        },
      };

export const pool = new Pool({
  connectionString: databaseUrl,
  max: maxConnections,
  ...sslConfig,
});

// Update pool gauges periodically. unref() so the interval alone cannot keep a
// test worker process alive after the app has been closed.
const poolMetricsInterval = setInterval(() => {
  metrics.dbPoolSize.set(maxConnections);
  metrics.dbPoolAvailable.set(pool.idleCount);
}, 5000);
poolMetricsInterval.unref();

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});

let dbClosed = false;

/**
 * Destroy the global pool and stop the metrics interval. The production server
 * never calls this; tests use it so worker processes can exit cleanly.
 */
export async function closeDb(): Promise<void> {
  if (dbClosed) return;
  dbClosed = true;
  clearInterval(poolMetricsInterval);
  await db.destroy();
}

export type { DB } from "./types.js";

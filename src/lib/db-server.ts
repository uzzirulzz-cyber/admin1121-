import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { WORKERS_DEPLOY } from "./env-flag";

let d1Client: PrismaClient | null = null;

async function getWorkersDb(): Promise<PrismaClient> {
  if (d1Client) return d1Client;
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const binding = (env as Record<string, unknown>).DB;
  if (!binding) throw new Error("D1 binding 'DB' is not available in the worker environment");
  d1Client = new PrismaClient({ adapter: new PrismaD1(binding as never) });
  return d1Client;
}

/**
 * Single data access entry point.
 * - Local dev / preview: SQLite file via PrismaBetterSQLite3.
 * - Cloudflare Workers production: D1 via PrismaD1 adapter.
 */
export async function getDb(): Promise<PrismaClient> {
  if (WORKERS_DEPLOY) return getWorkersDb();
  const { getDevDb } = await import("./db");
  return getDevDb();
}

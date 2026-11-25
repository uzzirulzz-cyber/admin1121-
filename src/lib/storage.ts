import { WORKERS_DEPLOY } from "./env-flag";
import { getDb } from "./db-server";

export interface StoredFile {
  data: Uint8Array;
  contentType: string;
}

/** Files below this size can be safely stored as D1 bound parameters. */
const MAX_DB_ASSET_BYTES = 900 * 1024;

type R2LikeBucket = {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    opts?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
    arrayBuffer(): Promise<ArrayBuffer>;
  } | null>;
};

async function getWorkersEnv(): Promise<Record<string, unknown>> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return env as Record<string, unknown>;
}

function publicUrl(key: string): string {
  return `/api/files/${key}`;
}

/**
 * Store an uploaded file.
 * Priority on Workers: R2 binding (MEDIA) -> D1 asset table (small files).
 * In local dev: filesystem under public/uploads.
 */
export async function putObject(
  key: string,
  data: Uint8Array,
  contentType: string
): Promise<{ url: string; key: string }> {
  if (WORKERS_DEPLOY) {
    const env = await getWorkersEnv();
    const r2 = env.MEDIA as R2LikeBucket | undefined;
    if (r2) {
      await r2.put(key, data, { httpMetadata: { contentType } });
      return { url: publicUrl(key), key };
    }
    if (data.byteLength > MAX_DB_ASSET_BYTES) {
      throw new Error(
        "File exceeds 900 KB and R2 storage is not enabled on this Cloudflare account yet. Enable R2 in the Cloudflare Dashboard (R2 > Enable) and add the MEDIA binding, or link an external file URL instead."
      );
    }
    const db = await getDb();
    await db.asset.upsert({
      where: { key },
      create: { key, contentType, size: data.byteLength, data },
      update: { contentType, size: data.byteLength, data },
    });
    return { url: publicUrl(key), key };
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const cwd = process.cwd();
  const target = join(cwd, "public", "uploads", key);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
  return { url: publicUrl(key), key };
}

/** Read a stored object for serving through /api/files/[...key]. */
export async function getObject(key: string): Promise<StoredFile | null> {
  if (WORKERS_DEPLOY) {
    const env = await getWorkersEnv();
    const r2 = env.MEDIA as R2LikeBucket | undefined;
    if (r2) {
      const obj = await r2.get(key);
      if (!obj) return null;
      const buf = new Uint8Array(await obj.arrayBuffer());
      return { data: buf, contentType: obj.httpMetadata?.contentType ?? "application/octet-stream" };
    }
    const db = await getDb();
    const asset = await db.asset.findUnique({ where: { key } });
    if (!asset) return null;
    return {
      data: new Uint8Array(asset.data as unknown as ArrayBuffer),
      contentType: asset.contentType,
    };
  }

  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const safeKey = key.replace(/\\/g, "/").replace(/\.\./g, "");
    const target = join(process.cwd(), "public", "uploads", safeKey);
    const buf = await readFile(target);
    return { data: new Uint8Array(buf), contentType: guessContentType(safeKey) };
  } catch {
    return null;
  }
}

export function guessContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aiff: "audio/aiff",
    zip: "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}

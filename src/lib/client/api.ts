"use client";

export async function api<T>(
  path: string,
  opts?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(path, {
    method: opts?.method ?? "GET",
    headers: opts?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      (data as { error?: string; details?: string[] }).details?.join(", ") ??
      (data as { error?: string }).error ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function uploadFile(file: File): Promise<{ url: string; key: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Upload failed");
  }
  return res.json() as Promise<{ url: string; key: string }>;
}

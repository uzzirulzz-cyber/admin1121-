import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { putObject, guessContentType } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard cap per file

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  const contentType = file.type || guessContentType(file.name);
  const allowed = contentType.startsWith("image/") ||
    contentType.startsWith("audio/") ||
    contentType === "application/zip";
  if (!allowed) {
    return NextResponse.json(
      { error: "Only image, audio, and zip files are allowed" },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25 MB limit" }, { status: 400 });
  }

  const extRaw = file.name.includes(".") ? file.name.split(".").pop()! : "";
  const ext = extRaw.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8);
  const key = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}${ext ? "." + ext : ""}`;

  try {
    const result = await putObject(key, bytes, contentType);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

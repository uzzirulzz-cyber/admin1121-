import { NextRequest, NextResponse } from "next/server";
import { getObject, guessContentType } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const file = await getObject(key);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType =
    file.contentType && file.contentType !== "application/octet-stream"
      ? file.contentType
      : guessContentType(key);

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(file.data.byteLength),
    },
  });
}

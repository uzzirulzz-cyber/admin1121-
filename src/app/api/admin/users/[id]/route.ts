import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { generateSalt, hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const data: Record<string, string> = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.password) {
    const salt = generateSalt();
    data.salt = salt;
    data.passwordHash = await hashPassword(parsed.data.password, salt);
  }

  try {
    const user = await db.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const { id } = await params;

  if (id === admin.userId) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }
  const count = await db.adminUser.count();
  if (count <= 1) {
    return NextResponse.json({ error: "Cannot delete the last admin account" }, { status: 400 });
  }
  try {
    await db.adminUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}

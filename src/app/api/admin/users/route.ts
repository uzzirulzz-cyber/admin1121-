import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { generateSalt, hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const users = await db.adminUser.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

const createSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  const email = parsed.data.email.trim().toLowerCase();
  const exists = await db.adminUser.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "An admin with this email already exists" }, { status: 400 });
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(parsed.data.password, salt);
  const user = await db.adminUser.create({
    data: { email, name: parsed.data.name, passwordHash, salt },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ user });
}

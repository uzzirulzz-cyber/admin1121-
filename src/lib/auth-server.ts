import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { WORKERS_DEPLOY } from "./env-flag";
import { verifyPassword } from "./password";
import { getDb } from "./db-server";

export const SESSION_COOKIE = "pb_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminContext {
  userId: string;
  email: string;
  name: string;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: WORKERS_DEPLOY,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  const token =
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { token, userId, expiresAt } });
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.session.deleteMany({ where: { token } });
  }
}

export async function authenticate(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string } | null> {
  const db = await getDb();
  const user = await db.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  const ok = await verifyPassword(password, user.salt, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function requireAdmin(): Promise<AdminContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return {
    userId: session.userId,
    email: session.user.email,
    name: session.user.name,
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

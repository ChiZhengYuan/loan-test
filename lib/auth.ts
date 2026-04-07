import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { env } from "./env";
import { hmacToken, safeEqual } from "./crypto";

const COOKIE_NAME = "admin_session";

type SessionPayload = {
  adminId: string;
  email: string;
  exp: number;
};

function encodeSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = hmacToken(data, env.APP_SESSION_SECRET);
  return `${data}.${sig}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = hmacToken(data, env.APP_SESSION_SECRET);
  if (!safeEqual(sig, expected)) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function createAdminSession(adminId: string, email: string) {
  const payload: SessionPayload = {
    adminId,
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  return encodeSession(payload);
}

export async function verifyAdminSession(token?: string) {
  if (!token) return null;
  const payload = decodeSession(token);
  if (!payload || payload.exp < Date.now()) return null;
  const admin = await prisma.adminUser.findUnique({ where: { id: payload.adminId } });
  if (!admin || admin.email !== payload.email) return null;
  return admin;
}

export async function getCurrentAdmin() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export function setAdminCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAdminCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function verifyAdminPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function hashAdminPassword(password: string) {
  return bcrypt.hash(password, 12);
}

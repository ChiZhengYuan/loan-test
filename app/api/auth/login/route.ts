import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAdminSession, verifyAdminPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/zod";
import { writeAuditLog } from "@/lib/audit";
import { formatApiError } from "@/lib/api-errors";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: formatApiError(parsed.error, "登入資料有誤。") }, { status: 400 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (!admin) {
    return NextResponse.json({ ok: false, error: formatApiError("INVALID_CREDENTIALS", "登入失敗。") }, { status: 401 });
  }

  const valid = await verifyAdminPassword(parsed.data.password, admin.passwordHash);
  if (!valid) {
    await writeAuditLog({
      action: "admin_login_failed",
      actorType: "admin",
      actorId: admin.id,
      ipAddress: getRequestIp(request),
      userAgent: getRequestUserAgent(request)
    });
    return NextResponse.json({ ok: false, error: formatApiError("INVALID_CREDENTIALS", "登入失敗。") }, { status: 401 });
  }

  const token = await createAdminSession(admin.id, admin.email);
  const response = NextResponse.json({
    ok: true,
    admin: { id: admin.id, email: admin.email, name: admin.name }
  });
  response.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  await writeAuditLog({
    action: "admin_login_success",
    actorType: "admin",
    actorId: admin.id,
    ipAddress: getRequestIp(request),
    userAgent: getRequestUserAgent(request)
  });

  return response;
}

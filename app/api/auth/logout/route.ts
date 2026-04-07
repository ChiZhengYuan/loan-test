import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  await writeAuditLog({
    action: "admin_logout",
    actorType: "admin",
    actorId: admin?.id ?? null,
    ipAddress: getRequestIp(request),
    userAgent: getRequestUserAgent(request)
  });

  return response;
}

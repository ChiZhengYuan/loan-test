import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: true, admin: null });
  return NextResponse.json({
    ok: true,
    admin: { id: admin.id, email: admin.email, name: admin.name }
  });
}

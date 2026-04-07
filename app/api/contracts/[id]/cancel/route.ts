import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { cancelContract } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const contract = await cancelContract(id, {
    ip: getRequestIp(request),
    userAgent: getRequestUserAgent(request)
  });
  return NextResponse.json({ ok: true, contract });
}

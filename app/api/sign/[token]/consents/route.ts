import { NextRequest, NextResponse } from "next/server";
import { saveConsents } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const body = await request.json();
  try {
    await saveConsents(token, body, {
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request)
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CONSENT_SAVE_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

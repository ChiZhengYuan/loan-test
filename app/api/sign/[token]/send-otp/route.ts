import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  try {
    const result = await sendOtp(token, {
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request)
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP_SEND_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";
import { formatApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const body = await request.json();
  try {
    const result = await verifyOtp(token, body, {
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request)
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = formatApiError(error, "OTP_VERIFY_FAILED");
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

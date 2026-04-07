import { NextRequest, NextResponse } from "next/server";
import { completeContract } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  try {
    const result = await completeContract(token, {
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request)
    });
    return NextResponse.json({
      ok: true,
      ...result,
      downloadUrl: result.pdfPath ? `/api/contracts/by-token/${token}/pdf` : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "COMPLETE_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

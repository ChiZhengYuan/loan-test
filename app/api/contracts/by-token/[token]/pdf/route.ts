import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getContractByToken, ensureFinalPdf } from "@/lib/contract-service";
import { writeAuditLog } from "@/lib/audit";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const contract = await getContractByToken(token);
  if (!contract) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  const pdfPath = await ensureFinalPdf(contract);
  if (!pdfPath) return NextResponse.json({ ok: false, error: "PDF_NOT_READY" }, { status: 409 });
  const bytes = await fs.readFile(pdfPath);
  await writeAuditLog({
    contractCaseId: contract.id,
    action: "download_pdf",
    actorType: "borrower",
    ipAddress: getRequestIp(request),
    userAgent: getRequestUserAgent(request),
    meta: { pdfPath, source: "public" }
  });
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contract-${contract.contractNo}.pdf"`
    }
  });
}

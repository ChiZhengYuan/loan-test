import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getContractById, ensureFinalPdf } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const contract = await getContractById(id);
  if (!contract) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  const pdfPath = await ensureFinalPdf(contract);
  if (!pdfPath) return NextResponse.json({ ok: false, error: "PDF_NOT_READY" }, { status: 409 });
  const bytes = await fs.readFile(pdfPath);

  await writeAuditLog({
    contractCaseId: contract.id,
    action: "download_pdf",
    actorType: "admin",
    actorId: admin.id,
    ipAddress: getRequestIp(request),
    userAgent: getRequestUserAgent(request),
    meta: { pdfPath }
  });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${path.basename(contract.pdfPath ?? contract.pdfArchive?.pdfPath ?? `contract-${contract.contractNo}.pdf`)}"`,
      "Cache-Control": "no-store"
    }
  });
}

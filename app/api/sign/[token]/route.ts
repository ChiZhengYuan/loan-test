import { NextRequest, NextResponse } from "next/server";
import { getContractByToken, toContractSnapshot } from "@/lib/contract-service";
import { buildLegalDocumentText } from "@/lib/contract";
import { writeAuditLog } from "@/lib/audit";
import { getIpFromHeaders, getUserAgentFromHeaders } from "@/lib/request";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const contract = await getContractByToken(token);
  if (!contract) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const snapshot = toContractSnapshot(contract);
  const document = buildLegalDocumentText(snapshot, contract.contractNo);
  await writeAuditLog({
    contractCaseId: contract.id,
    action: "open_sign_page",
    actorType: "borrower",
    ipAddress: getIpFromHeaders(_request.headers),
    userAgent: getUserAgentFromHeaders(_request.headers),
    meta: { token }
  });
  return NextResponse.json({
    ok: true,
    contract: {
      id: contract.id,
      contractNo: contract.contractNo,
      status: contract.status,
      publicSigningUrl: contract.publicSigningUrl,
      lender: JSON.parse(contract.lenderSnapshotJson),
      vehicle: JSON.parse(contract.vehicleSnapshotJson),
      schedule: {
        borrowStartAt: contract.borrowStartAt,
        borrowEndAt: contract.borrowEndAt
      },
      financial: {
        depositAmount: contract.depositAmount,
        overduePenaltyPerDay: contract.overduePenaltyPerDay
      },
      borrowerPhone: contract.borrowerPhone,
      borrowerNameHint: contract.borrowerNameHint,
      signedAt: contract.signedAt,
      otpVerifiedAt: contract.otpVerifiedAt,
      gpsStatus: contract.gpsStatus,
      signatureExists: Boolean(contract.signature),
      pdfPath: contract.pdfPath
    },
    document,
    snapshot,
    progress: {
      profileComplete: Boolean(contract.borrowerSnapshot),
      consentsComplete: Boolean(contract.consentsSnapshotJson),
      otpVerified: Boolean(contract.otpVerifiedAt),
      signatureCaptured: Boolean(contract.signature),
      gpsCaptured: Boolean(contract.gpsStatus)
    }
  });
}

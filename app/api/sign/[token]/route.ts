import { NextRequest, NextResponse } from "next/server";
import { getContractByToken, getLatestPendingContract, toContractSnapshot } from "@/lib/contract-service";
import { buildLegalDocumentText } from "@/lib/contract";
import { writeAuditLog } from "@/lib/audit";
import { getIpFromHeaders, getUserAgentFromHeaders } from "@/lib/request";
import { DEMO_SIGN_TOKEN } from "@/lib/demo";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const contract = await getContractByToken(token);
  if (!contract || contract.status !== "PENDING_SIGN") {
    if (token === DEMO_SIGN_TOKEN) {
      const nextContract = await getLatestPendingContract();
      if (nextContract) {
        return NextResponse.json({
          ok: true,
          contract: {
            id: nextContract.id,
            contractNo: nextContract.contractNo,
            status: nextContract.status,
            publicSigningUrl: nextContract.publicSigningUrl,
            lender: JSON.parse(nextContract.lenderSnapshotJson),
            vehicle: JSON.parse(nextContract.vehicleSnapshotJson),
            schedule: {
              borrowStartAt: nextContract.borrowStartAt,
              borrowEndAt: nextContract.borrowEndAt
            },
            finance: {
              depositAmount: "",
              overduePenaltyPerDay: nextContract.overduePenaltyPerDay.toString()
            },
            borrowerPhone: nextContract.borrowerPhone,
            borrowerNameHint: nextContract.borrowerNameHint,
            signedAt: nextContract.signedAt,
            otpVerifiedAt: nextContract.otpVerifiedAt,
            gpsStatus: nextContract.gpsStatus,
            signatureExists: false,
            pdfPath: nextContract.pdfPath
          },
          document: buildLegalDocumentText(toContractSnapshot(nextContract), nextContract.contractNo),
          snapshot: toContractSnapshot(nextContract),
          progress: {
            profileComplete: false,
            consentsComplete: Boolean(nextContract.consentsSnapshotJson),
            otpVerified: Boolean(nextContract.otpVerifiedAt),
            signatureCaptured: false,
            gpsCaptured: Boolean(nextContract.gpsStatus)
          }
        });
      }
    }
    if (!contract) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: false, error: "CASE_NOT_SIGNABLE" }, { status: 400 });
  }

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
      finance: {
        depositAmount: "",
        overduePenaltyPerDay: contract.overduePenaltyPerDay.toString()
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

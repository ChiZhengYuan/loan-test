import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getContractByToken } from "@/lib/contract-service";
import { SigningWorkflow } from "@/components/signing-workflow";
import { writeAuditLog } from "@/lib/audit";
import { getIpFromHeaders, getUserAgentFromHeaders } from "@/lib/request";

type Params = { params: Promise<{ token: string }> };

export default async function SignPage({ params }: Params) {
  const { token } = await params;
  const contract = await getContractByToken(token);
  if (!contract) notFound();
  const document = JSON.parse(contract.clauseSnapshotJson);
  const requestHeaders = await headers();
  await writeAuditLog({
    contractCaseId: contract.id,
    action: "open_sign_page",
    actorType: "borrower",
    ipAddress: getIpFromHeaders(requestHeaders),
    userAgent: getUserAgentFromHeaders(requestHeaders),
    meta: { token, source: "page" }
  });
  const snapshot = {
    lender: JSON.parse(contract.lenderSnapshotJson),
    borrowerHint: JSON.parse(contract.borrowerSnapshotJson ?? JSON.stringify({ name: contract.borrowerNameHint, phone: contract.borrowerPhone })),
    vehicle: JSON.parse(contract.vehicleSnapshotJson),
    schedule: {
      borrowStartAt: contract.borrowStartAt.toISOString(),
      borrowEndAt: contract.borrowEndAt.toISOString()
    },
    finance: {
      depositAmount: "",
      overduePenaltyPerDay: contract.overduePenaltyPerDay.toString()
    },
    terms: {
      specialTerms: document.specialTerms ?? contract.specialTerms,
      courtJurisdiction: document.courtJurisdiction ?? contract.courtJurisdiction
    }
  };

  return (
    <SigningWorkflow
      token={token}
      initial={{
        contract: {
          id: contract.id,
          contractNo: contract.contractNo,
          status: contract.status,
          publicSigningUrl: contract.publicSigningUrl,
          lender: JSON.parse(contract.lenderSnapshotJson),
          lenderNameHint: contract.lenderName,
          vehicle: {
            plate: contract.vehiclePlate,
            model: contract.vehicleModel,
            color: contract.vehicleColor,
            year: contract.vehicleYear
          },
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
          gpsStatus: contract.gpsStatus
        },
        snapshot,
        document,
        progress: {
          profileComplete: Boolean(contract.borrowerSnapshot),
          consentsComplete: Boolean(contract.consentsSnapshotJson),
          otpVerified: Boolean(contract.otpVerifiedAt),
          signatureCaptured: Boolean(contract.signature),
          gpsCaptured: Boolean(contract.gpsStatus)
        }
      }}
    />
  );
}

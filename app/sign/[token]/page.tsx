import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getContractByToken, getLatestPendingContract } from "@/lib/contract-service";
import { DEMO_SIGN_TOKEN } from "@/lib/demo";
import { SigningWorkflow } from "@/components/signing-workflow";
import { writeAuditLog } from "@/lib/audit";
import { getIpFromHeaders, getUserAgentFromHeaders } from "@/lib/request";

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type Params = { params: Promise<{ token: string }> };

export default async function SignPage({ params }: Params) {
  const { token } = await params;
  const contract = await getContractByToken(token);
  if (!contract || contract.status !== "PENDING_SIGN") {
    if (token === DEMO_SIGN_TOKEN) {
      const nextContract = await getLatestPendingContract();
      if (nextContract?.signToken && nextContract.signToken !== token) {
        redirect(`/sign/${nextContract.signToken}`);
      }
    }
    if (!contract) notFound();
    if (contract.status !== "PENDING_SIGN") notFound();
  }

  try {
    const document = safeJsonParse<{ sections: any[]; specialTerms?: string; courtJurisdiction?: string }>(contract.clauseSnapshotJson, { sections: [] });
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
      lender: safeJsonParse(contract.lenderSnapshotJson, { name: contract.lenderName, id: contract.lenderId, phone: contract.lenderPhone }),
      borrowerHint: safeJsonParse(contract.borrowerSnapshotJson, { name: contract.borrowerNameHint, phone: contract.borrowerPhone }),
      vehicle: safeJsonParse(contract.vehicleSnapshotJson, {
        plate: contract.vehiclePlate,
        model: contract.vehicleModel,
        color: contract.vehicleColor,
        year: contract.vehicleYear
      }),
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
            lender: safeJsonParse(contract.lenderSnapshotJson, { name: contract.lenderName, id: contract.lenderId, phone: contract.lenderPhone }),
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
  } catch (error) {
    console.error("[sign page] failed", error);
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">頁面暫時無法開啟</h1>
          <p className="text-sm text-slate-600">
            簽署頁目前正在整理資料或遇到暫時性問題，請稍後重新整理。若問題持續，請重新開啟簽署連結。
          </p>
        </div>
      </main>
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createContractCase } from "@/lib/contract-service";
import { getRequestIp, getRequestUserAgent } from "@/lib/request";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const today = new Date();
    const borrowStartAt = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const borrowEndAt = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    const contract = await createContractCase(
      {
        lenderName: "王大明",
        lenderId: "A123456789",
        lenderPhone: "0912345678",
        vehiclePlate: "ABC-1234",
        vehicleModel: "Toyota Altis",
        vehicleColor: "白色",
        vehicleYear: 2022,
        borrowStartAt: borrowStartAt.toISOString(),
        borrowEndAt: borrowEndAt.toISOString(),
        depositAmount: 10000,
        overduePenaltyPerDay: 2000,
        specialTerms: "車輛僅供一般代步使用，不得改裝或轉借。",
        courtJurisdiction: "臺灣臺北地方法院",
        borrowerPhone: "0987654321",
        borrowerNameHint: "陳小美"
      },
      null
    );

    await writeAuditLog({
      contractCaseId: contract.id,
      action: "create_demo_case",
      actorType: "system",
      ipAddress: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
      meta: { contractNo: contract.contractNo, signToken: contract.signToken }
    });

    return NextResponse.redirect(new URL(`/sign/${contract.signToken}`, request.url), 303);
  } catch (error) {
    console.error("[demo next] failed", error);
    const message = error instanceof Error ? error.message : "建立示範案件失敗";
    return NextResponse.json({ ok: false, error: "建立示範案件失敗", detail: message }, { status: 400 });
  }
}

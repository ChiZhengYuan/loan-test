import { prisma } from "@/lib/db";
import { createContractCase } from "@/lib/contract-service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function ensureDemoContract() {
  try {
    const pending = await prisma.contractCase.findFirst({
      where: { status: "PENDING_SIGN" },
      orderBy: { createdAt: "desc" }
    });

    if (pending) return pending;

    return await createContractCase({
      lenderName: "王大明",
      lenderId: "A123456789",
      lenderPhone: "0912345678",
      vehiclePlate: "ABC-1234",
      vehicleModel: "Toyota Altis",
      vehicleColor: "白色",
      vehicleYear: 2022,
      borrowStartAt: new Date(Date.now() + 86400000).toISOString(),
      borrowEndAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      depositAmount: 10000,
      overduePenaltyPerDay: 2000,
      specialTerms: "車輛僅供一般代步使用，不得改裝或轉借。",
      courtJurisdiction: "臺灣臺北地方法院",
      borrowerPhone: "0987654321",
      borrowerNameHint: "陳小美"
    });
  } catch (error) {
    console.error("[home] failed to ensure demo contract", error);
    return null;
  }
}

export default async function HomePage() {
  const contract = await ensureDemoContract();
  if (!contract) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">系統初始化中</h1>
          <p className="text-sm text-slate-600">
            目前資料庫尚未就緒或還沒有建立示範案件，請稍後重新整理頁面。
          </p>
        </div>
      </main>
    );
  }

  redirect(`/sign/${contract.signToken}`);
}

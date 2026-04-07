import { prisma } from "@/lib/db";
import { createContractCase } from "@/lib/contract-service";
import { redirect } from "next/navigation";

async function ensureDemoContract() {
  const pending = await prisma.contractCase.findFirst({
    where: { status: "PENDING_SIGN" },
    orderBy: { createdAt: "desc" }
  });

  if (pending) return pending;

  return createContractCase({
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
}

export default async function HomePage() {
  const contract = await ensureDemoContract();
  redirect(`/sign/${contract.signToken}`);
}

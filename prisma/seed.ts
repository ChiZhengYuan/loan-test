async function main() {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  process.env.APP_URL = process.env.APP_URL ?? "http://localhost:3000";
  process.env.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET ?? "change-me-change-me-change-me-1234";

  const { prisma } = await import("../lib/db");
  const { createContractCase } = await import("../lib/contract-service");
  const { ensureStorage } = await import("../lib/storage");

  await ensureStorage();

  const contractCount = await prisma.contractCase.count();
  if (contractCount === 0) {
    await createContractCase({
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
}

main()
  .then(() => {
    console.log("Seed completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

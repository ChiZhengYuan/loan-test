async function main() {
  process.env.APP_URL = process.env.APP_URL ?? "http://localhost:3000";
  process.env.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET ?? "change-me-change-me-change-me-1234";

  const { prisma } = await import("../lib/db");
  const { randomToken } = await import("../lib/crypto");
  const { format } = await import("date-fns");

  const contractCount = await prisma.contractCase.count();
  if (contractCount === 0) {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    const count = await prisma.contractCase.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });

    const contractNo = `BV${format(today, "yyyyMMdd")}-${String(count + 1).padStart(3, "0")}`;
    const signToken = randomToken(32);
    const publicSigningUrl = `${process.env.APP_URL.replace(/\/$/, "")}/sign/${signToken}`;

    await prisma.contractCase.create({
      data: {
        contractNo,
        signToken,
        publicSigningUrl,
        status: "PENDING_SIGN",
        lenderName: "王大明",
        lenderId: "A123456789",
        lenderPhone: "0912345678",
        borrowerNameHint: "陳小美",
        borrowerPhone: "0987654321",
        vehiclePlate: "ABC-1234",
        vehicleModel: "Toyota Altis",
        vehicleColor: "白色",
        vehicleYear: 2022,
        borrowStartAt: new Date(Date.now() + 86400000),
        borrowEndAt: new Date(Date.now() + 86400000 * 3),
        depositAmount: 10000,
        overduePenaltyPerDay: 2000,
        specialTerms: "車輛僅供一般代步使用，不得改裝或轉借。",
        courtJurisdiction: "臺灣臺北地方法院",
        lenderSnapshotJson: JSON.stringify({ name: "王大明", id: "A123456789", phone: "0912345678" }),
        borrowerSnapshotJson: JSON.stringify({ name: "陳小美", phone: "0987654321" }),
        vehicleSnapshotJson: JSON.stringify({ plate: "ABC-1234", model: "Toyota Altis", color: "白色", year: 2022 }),
        clauseSnapshotJson: JSON.stringify({
          title: "車主委託放租契約",
          specialTerms: "車輛僅供一般代步使用，不得改裝或轉借。",
          courtJurisdiction: "臺灣臺北地方法院"
        })
      }
    });

    console.log(`Seeded demo contract: ${contractNo}`);
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

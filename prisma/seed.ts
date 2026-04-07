async function main() {
  process.env.APP_URL = process.env.APP_URL ?? "http://localhost:3000";
  process.env.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET ?? "change-me-change-me-change-me-1234";

  const { prisma } = await import("../lib/db");
  const { format } = await import("date-fns");
  const { DEMO_SIGN_TOKEN } = await import("../lib/demo");
  const { buildLegalDocumentText } = await import("../lib/contract");

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
  const publicSigningUrl = `${process.env.APP_URL.replace(/\/$/, "")}/sign/${DEMO_SIGN_TOKEN}`;
  const snapshot = {
    lender: { name: "王大明", id: "A123456789", phone: "0912345678" },
    borrowerHint: { name: "陳小美", phone: "0987654321" },
    vehicle: { plate: "ABC-1234", model: "Toyota Altis", color: "白色", year: 2022 },
    schedule: {
      borrowStartAt: new Date(Date.now() + 86400000).toISOString(),
      borrowEndAt: new Date(Date.now() + 86400000 * 3).toISOString()
    },
    finance: {
      depositAmount: "",
      overduePenaltyPerDay: "2000"
    },
    terms: {
      specialTerms: "車輛僅供一般代步使用，不得改裝或轉借。",
      courtJurisdiction: "臺灣臺北地方法院"
    }
  };
  const document = buildLegalDocumentText(snapshot, contractNo);
  const data = {
    contractNo,
    signToken: DEMO_SIGN_TOKEN,
    publicSigningUrl,
    status: "PENDING_SIGN",
    lenderName: snapshot.lender.name,
    lenderId: snapshot.lender.id,
    lenderPhone: snapshot.lender.phone,
    borrowerNameHint: snapshot.borrowerHint.name,
    borrowerPhone: snapshot.borrowerHint.phone,
    vehiclePlate: snapshot.vehicle.plate,
    vehicleModel: snapshot.vehicle.model,
    vehicleColor: snapshot.vehicle.color,
    vehicleYear: snapshot.vehicle.year,
    borrowStartAt: new Date(snapshot.schedule.borrowStartAt),
    borrowEndAt: new Date(snapshot.schedule.borrowEndAt),
    depositAmount: 10000,
    overduePenaltyPerDay: 2000,
    specialTerms: snapshot.terms.specialTerms,
    courtJurisdiction: snapshot.terms.courtJurisdiction,
    lenderSnapshotJson: JSON.stringify(snapshot.lender),
    borrowerSnapshotJson: JSON.stringify(snapshot.borrowerHint),
    vehicleSnapshotJson: JSON.stringify(snapshot.vehicle),
    clauseSnapshotJson: JSON.stringify(document)
  };

  const latest = await prisma.contractCase.findFirst({ orderBy: { createdAt: "desc" } });
  if (latest) {
    await prisma.contractCase.update({ where: { id: latest.id }, data });
  } else {
    await prisma.contractCase.create({ data });
  }

  console.log(`Seeded demo contract: ${contractNo}`);
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

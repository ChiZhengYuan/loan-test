import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const contract = await prisma.contractCase.findFirst({
    where: { status: "PENDING_SIGN" },
    orderBy: { createdAt: "desc" }
  }).catch((error) => {
    console.error("[home] contract lookup failed", error);
    return null;
  });

  if (contract) {
    redirect(`/sign/${contract.signToken}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">系統已啟動</h1>
        <p className="text-sm text-slate-600">
          目前尚未建立可簽署案件。請先在資料庫建立一筆案件，或透過管理端建立測試案件後再回來。 
        </p>
      </div>
    </main>
  );
}

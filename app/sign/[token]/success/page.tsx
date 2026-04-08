import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContractByToken, ensureFinalPdf } from "@/lib/contract-service";

function formatTaiwanDateTime(value: string | number | Date) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${lookup("year")}/${lookup("month")}/${lookup("day")} ${lookup("dayPeriod")}${lookup("hour")}:${lookup("minute")}:${lookup("second")}`;
}

type Params = { params: Promise<{ token: string }>; searchParams?: Promise<{ telegram?: string }> };

export default async function SignSuccessPage({ params }: Params) {
  const { token } = await params;
  const contract = await getContractByToken(token);
  if (!contract) notFound();

  const pdfPath = await ensureFinalPdf(contract);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <section className="w-full rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Image src="/logo-transparent.png" alt="將誠租車 Logo" width={56} height={56} className="h-14 w-14 rounded-2xl object-cover shadow-sm" priority />
              <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium tracking-wide text-emerald-700">簽署成功</div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">契約已完成封存</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                您的簽署已完成，系統已生成正式 PDF 並封存。您可以立即返回首頁。
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">契約編號</div>
                <div className="mt-1 font-mono text-sm break-all">{contract.contractNo}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">簽署時間</div>
                <div className="mt-1 text-sm">{contract.signedAt ? formatTaiwanDateTime(contract.signedAt) : "-"}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">PDF 狀態</div>
                <div className="mt-1 text-sm">{pdfPath ? "已生成並封存" : "處理中"}</div>
              </div>
            </div>

            <div className="flex justify-center">
              <Link href="/" className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-8 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                返回首頁
              </Link>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              這份 PDF 為簽署當下封存版本，內容不可覆蓋修改。
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

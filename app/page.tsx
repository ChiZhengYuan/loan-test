import { DEMO_SIGN_TOKEN } from "@/lib/demo";

export default function HomePage() {
  const signUrl = `/sign/${DEMO_SIGN_TOKEN}`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <section className="w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium tracking-wide text-slate-700">系統已啟動</span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">車主委託放租簽署系統</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                這是正式測試入口。你可以直接前往示範簽署頁，完成車主資料、車輛資訊、委託期間、OTP 與親簽，系統會在簽署後生成最終 PDF。
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">示範 Token</div>
                <div className="mt-1 font-mono text-sm break-all">{DEMO_SIGN_TOKEN}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">簽署頁網址</div>
                <div className="mt-1 font-mono text-sm break-all">{signUrl}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={signUrl} className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800">
                立即前往簽署頁
              </a>
              <a href={signUrl} className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                開啟示範案件
              </a>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">快速測試流程</div>
              <ol className="list-decimal space-y-1 pl-5 leading-6">
                <li>點擊「立即前往簽署頁」</li>
                <li>填寫車主與車輛資料</li>
                <li>閱讀條款並完成同意、OTP 與親簽</li>
                <li>完成後下載最終 PDF</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              如果你剛部署完成卻還看到舊畫面，請先強制重新整理一次。首頁現在不再依賴資料庫查詢，所以應該能穩定回應。
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

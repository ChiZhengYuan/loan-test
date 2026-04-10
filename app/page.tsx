import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <section className="w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image src="/logo-transparent.png" alt="將誠租車 Logo" width={56} height={56} className="h-14 w-14 rounded-xl object-cover shadow-sm" priority />
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium tracking-wide text-slate-700">系統已啟動</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">車主委託放租簽署系統</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                這是正式測試入口。每次點擊都會先建立一筆新的示範案件與新的 demo token，然後直接跳到簽署頁，方便你連續測試而不需要重新部署。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">每次點擊都會產生新的 demo token</div>
              <p className="mt-2 leading-6 text-slate-600">若你已完成上一輪簽署，只要再點一次下面任一按鈕，就會自動建立新的示範案件並進入下一輪測試。</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <form action="/api/demo/next" method="post" className="flex-1">
                <button type="submit" className="inline-flex h-11 w-full items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800">
                  立即前往簽署頁
                </button>
              </form>
              <form action="/api/demo/next" method="post" className="flex-1">
                <button type="submit" className="inline-flex h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                  開啟新示範案件
                </button>
              </form>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">快速測試流程</div>
              <ol className="list-decimal space-y-1 pl-5 leading-6">
                <li>點擊「立即前往簽署頁」或「開啟新示範案件」</li>
                <li>填寫車主與車輛資料</li>
                <li>閱讀條款並完成同意、OTP 與親簽</li>
                <li>完成後下載最終 PDF</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              如果你剛完成上一輪簽署，直接再按一次按鈕就會建立新的示範案件，不需要重新部署。
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

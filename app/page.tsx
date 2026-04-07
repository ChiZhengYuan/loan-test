"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO_SIGN_TOKEN } from "@/lib/demo";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/sign/${DEMO_SIGN_TOKEN}`);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">系統已啟動</h1>
        <p className="text-sm text-slate-600">
          系統正在為你開啟示範簽署頁，若沒有自動跳轉，請點擊下方連結。
        </p>
        <a className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" href={`/sign/${DEMO_SIGN_TOKEN}`}>
          前往簽署頁
        </a>
      </div>
    </main>
  );
}

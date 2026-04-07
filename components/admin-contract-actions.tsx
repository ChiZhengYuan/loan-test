"use client";

import { useRouter } from "next/navigation";

export function AdminContractActions({ contractId, signed }: { contractId: string; signed: boolean }) {
  const router = useRouter();

  return (
    <div className="flex gap-3">
      <a className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href={`/api/contracts/${contractId}/pdf`}>
        下載 PDF
      </a>
      {!signed ? (
        <button
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          onClick={async () => {
            await fetch(`/api/contracts/${contractId}/cancel`, { method: "POST" });
            router.refresh();
          }}
        >
          取消案件
        </button>
      ) : null}
    </div>
  );
}

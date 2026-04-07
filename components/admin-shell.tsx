import Link from "next/link";
import { ReactNode } from "react";
import { Separator } from "./ui/separator";

export function AdminShell({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div>
            <div className="text-sm text-muted-foreground">借用車輛委託書管理系統</div>
            <div className="text-xl font-semibold">{title}</div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/admin" className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
              Dashboard
            </Link>
            <Link href="/admin/contracts/new" className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
              建立案件
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {description ? <p className="mb-6 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
        <Separator className="mb-6" />
        {children}
      </main>
    </div>
  );
}

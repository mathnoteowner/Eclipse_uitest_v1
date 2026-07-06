import type { ReactNode } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 生成・改訂した文書の表示カード。本文はセリフ体で“契約書らしさ”を出す。
 * 主要操作は actions（ヘッダー直下）に置き、下までスクロールしなくても押せるようにする。
 * 本文は最大高さ内でスクロールし、印刷時は制約を解除して全文を出力する。
 */
export function DocumentCard({
  title,
  maskedCount,
  actions,
  children,
  footer,
  className,
}: {
  title: string;
  maskedCount?: number;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <FileText aria-hidden className="size-4 text-primary" />
          {title}
        </h3>
        {typeof maskedCount === "number" && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <ShieldCheck aria-hidden className="size-3.5" />
            {maskedCount}項目をマスクして生成
          </span>
        )}
      </header>
      {actions && (
        <div className="no-print flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {actions}
        </div>
      )}
      <div className="max-h-[60vh] overflow-y-auto px-6 py-5 font-serif text-[15px] leading-8 text-foreground print:max-h-none print:overflow-visible">
        {children}
      </div>
      {footer && (
        <footer className="no-print border-t border-border px-5 py-3">
          {footer}
        </footer>
      )}
    </section>
  );
}

import type { ReactNode } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 生成・改訂した文書の表示カード。本文はセリフ体で“契約書らしさ”を出す。
 */
export function DocumentCard({
  title,
  maskedCount,
  children,
  footer,
  className,
}: {
  title: string;
  maskedCount?: number;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
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
      <div className="px-6 py-5 font-serif text-[15px] leading-8 text-foreground">
        {children}
      </div>
      {footer && (
        <footer className="border-t border-border px-5 py-3">{footer}</footer>
      )}
    </section>
  );
}

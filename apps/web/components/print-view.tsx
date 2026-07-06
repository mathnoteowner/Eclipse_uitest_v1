"use client";

import { ChevronLeft, ChevronRight, Copy, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/services/types";

export interface PrintViewDoc {
  title: string;
  text: string;
  createdAt: string;
  docType?: DocType;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * 印刷ビュー（紙面プレビュー）。履歴の一覧性を高めるための閲覧モード。
 * 前後の文書をめくるように連続して確認できる。
 */
export function PrintView({
  doc,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  doc: PrintViewDoc;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/20 print:static print:overflow-visible print:bg-transparent">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 print:max-w-none print:p-0">
        <div className="no-print sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-card px-3 py-2 shadow-sm">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate font-medium text-foreground">
              {doc.title}
            </span>
            {doc.docType && (
              <span className="hidden shrink-0 sm:inline">
                ・{DOC_TYPE_LABELS[doc.docType]}
              </span>
            )}
            <span className="shrink-0">・{fmtDate(doc.createdAt)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="前の文書"
              disabled={!hasPrev}
              onClick={onPrev}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="次の文書"
              disabled={!hasNext}
              onClick={onNext}
            >
              <ChevronRight aria-hidden className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden /> 印刷 / PDF
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(doc.text);
                toast("クリップボードにコピーしました", "success");
              }}
            >
              <Copy aria-hidden /> コピー
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="閉じる"
              onClick={onClose}
            >
              <X aria-hidden className="size-4" />
            </Button>
          </div>
        </div>

        <div className="print-target flex-1 rounded-sm border border-border bg-card p-10 font-serif text-[15px] leading-8 text-foreground shadow-md print:border-0 print:p-0 print:shadow-none sm:p-12">
          <p className="whitespace-pre-wrap">{doc.text}</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, FilePlus2, Moon, Printer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DocumentCard } from "@/components/document-card";
import { EmptyState } from "@/components/status";
import { getHistoryService } from "@/lib/services/factory";
import type { HistoryRecord } from "@/lib/services/history";
import { DOC_TYPE_LABELS } from "@/lib/services/types";
import { cn } from "@/lib/utils";

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

/** 利用履歴の閲覧（端末内 localStorage のみ・サーバーには存在しない） */
export default function HistoryPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(getHistoryService().list());
  }, []);

  const selected = records?.find((r) => r.id === selectedId) ?? null;
  const refresh = () => setRecords(getHistoryService().list());

  const removeOne = (id: string) => {
    getHistoryService().remove(id);
    if (selectedId === id) setSelectedId(null);
    refresh();
    toast("履歴を削除しました", "success");
  };

  const clearAll = () => {
    if (!window.confirm("履歴をすべて削除します。よろしいですか？")) return;
    getHistoryService().clear();
    setSelectedId(null);
    refresh();
    toast("履歴をすべて削除しました", "success");
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="no-print">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-bold tracking-tight"
          >
            <Moon aria-hidden className="size-5 text-primary" />
            Eclipse
          </Link>
          <Link
            href="/create"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <FilePlus2 aria-hidden /> 契約書を作成
          </Link>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">利用履歴</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/60 px-4 py-3">
          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            履歴はこの端末内にのみ保存され、別の端末やブラウザからは見えません。本文には実際の氏名・社名が含まれます。不要になった履歴は削除してください。
          </p>
          {records && records.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 aria-hidden /> すべて削除
            </Button>
          )}
        </div>

        {records && records.length === 0 && (
          <EmptyState
            className="mt-5"
            title="履歴はまだありません"
            description="契約書を作成、または文書を修正して保存すると、この端末に記録されます。"
            action={
              <Link href="/create" className={buttonVariants({ size: "sm" })}>
                契約書を作成
              </Link>
            }
          />
        )}

        {records && records.length > 0 && (
          <ul className="mt-5 space-y-2">
            {records.map((r) => (
              <li key={r.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-4 py-3",
                    selectedId === r.id
                      ? "border-primary bg-accent/50"
                      : "border-border bg-card",
                  )}
                >
                  <button
                    type="button"
                    className="flex-1 text-left focus-visible:outline-none"
                    onClick={() =>
                      setSelectedId(r.id === selectedId ? null : r.id)
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {r.title}
                      </span>
                      <Badge variant={r.kind === "create" ? "default" : "outline"}>
                        {r.kind === "create" ? "新規作成" : "修正"}
                      </Badge>
                      {r.docType && (
                        <Badge variant="outline">
                          {DOC_TYPE_LABELS[r.docType]}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtDate(r.createdAt)}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="この履歴を削除"
                    onClick={() => removeOne(r.id)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <DocumentCard
          title={selected.title}
          className="mt-5"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {fmtDate(selected.createdAt)}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer aria-hidden /> PDFで保存
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(selected.text);
                    toast("クリップボードにコピーしました", "success");
                  }}
                >
                  <Copy aria-hidden /> コピー
                </Button>
              </div>
            </div>
          }
        >
          <div className="no-print whitespace-pre-wrap">{selected.text}</div>
          <div className="print-target hidden whitespace-pre-wrap print:block">
            {selected.text}
          </div>
        </DocumentCard>
      )}
    </main>
  );
}

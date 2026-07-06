"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, Moon, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ContractEditor } from "@/components/contract-editor";
import { EditorDrawer } from "@/components/editor-drawer";
import { EmptyState } from "@/components/status";
import { PrintView } from "@/components/print-view";
import { getHistoryService } from "@/lib/services/factory";
import { deriveTitle, type HistoryRecord } from "@/lib/services/history";
import { DOC_TYPE_LABELS } from "@/lib/services/types";

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
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    setRecords(getHistoryService().list());
  }, []);

  const refresh = () => setRecords(getHistoryService().list());

  const removeOne = (id: string) => {
    getHistoryService().remove(id);
    setViewIndex(null);
    if (editingId === id) setEditingId(null);
    refresh();
    toast("履歴を削除しました", "success");
  };

  const clearAll = () => {
    if (!window.confirm("履歴をすべて削除します。よろしいですか？")) return;
    getHistoryService().clear();
    setViewIndex(null);
    setEditingId(null);
    refresh();
    toast("履歴をすべて削除しました", "success");
  };

  const openEdit = (r: HistoryRecord) => {
    setEditingId(r.id);
    setEditDraft(r.text);
  };

  const saveEdit = () => {
    const t = editDraft.trim();
    if (!t) {
      toast("本文が空です", "error");
      return;
    }
    const rec = getHistoryService().save({
      kind: "edit",
      title: deriveTitle(t),
      text: t,
    });
    if (rec) {
      toast("履歴に保存しました", "success");
      refresh();
    } else {
      toast("履歴を保存できませんでした（容量上限の可能性）", "error");
    }
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
            AI書面くん
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
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {records.map((r, i) => (
              <li key={r.id} className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-sm px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  onClick={() => setViewIndex(i)}
                >
                  <span className="w-28 shrink-0 text-xs text-muted-foreground tnum">
                    {fmtDate(r.createdAt)}
                  </span>
                  <Badge
                    variant={r.kind === "create" ? "default" : "outline"}
                    className="shrink-0"
                  >
                    {r.kind === "create" ? "新規作成" : "修正"}
                  </Badge>
                  {r.docType && (
                    <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                      {DOC_TYPE_LABELS[r.docType]}
                    </Badge>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {r.title}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="この文書を編集"
                  onClick={() => openEdit(r)}
                >
                  <Pencil aria-hidden className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="この履歴を削除"
                  onClick={() => removeOne(r.id)}
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {records && viewIndex != null && records[viewIndex] && (
        <PrintView
          doc={records[viewIndex]}
          hasPrev={viewIndex > 0}
          hasNext={viewIndex < records.length - 1}
          onPrev={() => setViewIndex((i) => (i != null ? i - 1 : i))}
          onNext={() => setViewIndex((i) => (i != null ? i + 1 : i))}
          onClose={() => setViewIndex(null)}
        />
      )}

      <EditorDrawer
        open={editingId != null}
        title="文書を編集"
        onClose={() => setEditingId(null)}
      >
        <ContractEditor
          value={editDraft}
          onChange={setEditDraft}
          onSave={saveEdit}
          onPdf={() => window.print()}
        />
      </EditorDrawer>

      {editingId != null && (
        <div className="print-target hidden whitespace-pre-wrap font-serif text-[15px] leading-8 print:block">
          {editDraft}
        </div>
      )}
    </main>
  );
}

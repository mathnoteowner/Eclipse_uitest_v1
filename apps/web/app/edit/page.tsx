"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileText, History, Pencil, PenLine, Printer, Save } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { ContractEditor } from "@/components/contract-editor";
import { DocumentCard } from "@/components/document-card";
import { DocumentImporter } from "@/components/edit/document-importer";
import { EditorDrawer } from "@/components/editor-drawer";
import { EmptyState } from "@/components/status";
import { getHistoryService } from "@/lib/services/factory";
import { deriveTitle } from "@/lib/services/history";

const MODE_OPTIONS: { value: "create" | "edit"; label: string }[] = [
  { value: "create", label: "新規作成" },
  { value: "edit", label: "文書を修正" },
];

/**
 * 文書修正エディタ。
 * ★AIには一切送信しない（generation/billing/mask を import しないことで担保）。
 *   取込・清書・定型文挿入・編集・出力のすべてが端末内で完結する。
 */
export default function EditPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);

  const handleImport = (imported: string, fileName: string) => {
    setText(imported);
    toast(`「${fileName}」を読み込みました`, "success");
  };

  /** 履歴へ保存（同一内容の重複保存はしない） */
  const saveToHistory = (announce: boolean) => {
    const t = text.trim();
    if (!t) {
      if (announce) toast("本文が空です", "error");
      return;
    }
    if (t === lastSavedText) {
      if (announce) toast("この内容は保存済みです");
      return;
    }
    const rec = getHistoryService().save({
      kind: "edit",
      title: deriveTitle(t),
      text: t,
    });
    if (rec) {
      setLastSavedText(t);
      if (announce) toast("履歴に保存しました", "success");
    } else if (announce) {
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
            <FileText aria-hidden className="size-5 text-primary" />
            AI書面くん
          </Link>
          <Link
            href="/history"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <History aria-hidden /> 履歴
          </Link>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">文書を修正</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          アップロードまたは貼り付けた文書を、この端末の中だけで整えます。AIには送信しません（回数消費なし）。
        </p>

        <div className="mt-5">
          <SegmentedControl
            value={"edit" as "create" | "edit"}
            onChange={(m) => {
              if (m === "create") router.push("/create");
            }}
            options={MODE_OPTIONS}
          />
        </div>

        <section className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <DocumentImporter onImport={handleImport} />
        </section>

        {text.trim() ? (
          <DocumentCard
            title="編集中の文書"
            className="mt-5"
            footer={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditorOpen(true)}
                >
                  <Pencil aria-hidden /> 編集
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveToHistory(true)}
                >
                  <Save aria-hidden /> 履歴に保存
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    saveToHistory(false);
                    window.print();
                  }}
                >
                  <Printer aria-hidden /> PDFで保存
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(text);
                    saveToHistory(false);
                    toast("クリップボードにコピーしました", "success");
                  }}
                >
                  <Copy aria-hidden /> コピー
                </Button>
              </div>
            }
          >
            <div className="no-print whitespace-pre-wrap">{text}</div>
            <div className="print-target hidden whitespace-pre-wrap print:block">
              {text}
            </div>
          </DocumentCard>
        ) : (
          <EmptyState
            className="mt-5"
            title="編集する文書がまだありません"
            description="上でファイルを取り込むか、白紙から書き始められます。"
            action={
              <Button size="sm" onClick={() => setEditorOpen(true)}>
                <PenLine aria-hidden /> 白紙から編集を始める
              </Button>
            }
          />
        )}
      </div>

      <EditorDrawer
        open={editorOpen}
        title="文書を編集"
        onClose={() => setEditorOpen(false)}
      >
        <ContractEditor
          value={text}
          onChange={setText}
          onSave={() => saveToHistory(true)}
          onCopy={() => saveToHistory(false)}
          onPdf={() => {
            saveToHistory(false);
            window.print();
          }}
        />
      </EditorDrawer>
    </main>
  );
}

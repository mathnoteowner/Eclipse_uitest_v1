"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Moon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { ContractEditor } from "@/components/contract-editor";
import { DocumentImporter } from "@/components/edit/document-importer";
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
            <Moon aria-hidden className="size-5 text-primary" />
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

        <section className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5 sm:p-6">
            <DocumentImporter onImport={handleImport} />
          </div>
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
        </section>
      </div>

      <div className="print-target hidden whitespace-pre-wrap font-serif text-[15px] leading-8 print:block">
        {text}
      </div>
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookText,
  Copy,
  History,
  Moon,
  Printer,
  Save,
  Undo2,
  Wand2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { DocumentImporter } from "@/components/edit/document-importer";
import { SnippetPicker } from "@/components/edit/snippet-picker";
import { insertAtCursor } from "@/lib/edit/docx";
import { formatDocument } from "@/lib/edit/format";
import { getHistoryService } from "@/lib/services/factory";
import { deriveTitle } from "@/lib/services/history";

const MODE_OPTIONS: { value: "create" | "edit"; label: string }[] = [
  { value: "create", label: "新規作成" },
  { value: "edit", label: "文書を修正" },
];

/**
 * 文書修正エディタ。
 * ★AIには一切送信しない（generation/billing/mask を import しないことで担保）。
 *   取込・整形・定型文挿入・編集・出力のすべてが端末内で完結する。
 */
export default function EditPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [prevText, setPrevText] = useState<string | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImport = (imported: string, fileName: string) => {
    setPrevText(text.trim() ? text : null);
    setText(imported);
    toast(`「${fileName}」を読み込みました`, "success");
  };

  const handleFormat = () => {
    const next = formatDocument(text);
    if (next === text) {
      toast("整形の必要はありませんでした");
      return;
    }
    setPrevText(text);
    setText(next);
    toast("文書を整形しました", "success");
  };

  const handleUndo = () => {
    if (prevText == null) return;
    setText(prevText);
    setPrevText(null);
  };

  const insertSnippet = (body: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const res = insertAtCursor(text, body, start, end);
    setPrevText(text);
    setText(res.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(res.caret, res.caret);
    });
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
            Eclipse
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              id="btn-format"
              variant="secondary"
              size="sm"
              disabled={!text.trim()}
              onClick={handleFormat}
            >
              <Wand2 aria-hidden /> 整形
            </Button>
            <Button
              id="btn-undo"
              variant="ghost"
              size="sm"
              disabled={prevText == null}
              onClick={handleUndo}
            >
              <Undo2 aria-hidden /> 元に戻す
            </Button>
            <Button
              id="btn-snippets"
              variant={showSnippets ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSnippets((v) => !v)}
            >
              <BookText aria-hidden /> 定型文
            </Button>
          </div>

          {showSnippets && <SnippetPicker onInsert={insertSnippet} />}

          <Textarea
            id="f-doc"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ここに文書を貼り付けるか、上のファイル読み込みをお使いください。"
            className="mt-3 min-h-[26rem] font-serif text-[15px] leading-8"
          />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              処理はすべてこの端末内で行われます。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                id="btn-save-history"
                variant="ghost"
                size="sm"
                disabled={!text.trim()}
                onClick={() => saveToHistory(true)}
              >
                <Save aria-hidden /> 履歴に保存
              </Button>
              <Button
                id="btn-pdf"
                variant="secondary"
                size="sm"
                disabled={!text.trim()}
                onClick={() => {
                  saveToHistory(false);
                  window.print();
                }}
              >
                <Printer aria-hidden /> PDFで保存
              </Button>
              <Button
                id="btn-copy"
                size="sm"
                disabled={!text.trim()}
                onClick={async () => {
                  await navigator.clipboard.writeText(text);
                  saveToHistory(false);
                  toast("クリップボードにコピーしました", "success");
                }}
              >
                <Copy aria-hidden /> コピー
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="print-target hidden whitespace-pre-wrap font-serif text-[15px] leading-8 print:block">
        {text}
      </div>
    </main>
  );
}

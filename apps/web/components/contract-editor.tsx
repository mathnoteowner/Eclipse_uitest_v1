"use client";

import { useRef, useState } from "react";
import { BookText, Copy, FileDown, Save, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { SnippetPicker } from "@/components/edit/snippet-picker";
import { insertAtCursor } from "@/lib/edit/docx";
import { formatDocument } from "@/lib/edit/format";
import { cn } from "@/lib/utils";

/** 親（ページ）側でundoスタックを管理する場合に渡す */
export interface EditorUndoControl {
  canUndo: boolean;
  /** 直前の操作を1つ巻き戻す（ステップ単位。文字単位のCtrl+Zとは別） */
  onUndo: () => void;
  /** 操作（校正・挿入など）で本文を書き換える直前に現在値を積む */
  snapshot: () => void;
}

/**
 * 契約書エディタ（Wordの契約書特化版イメージ）。
 * 校正・定型文挿入・一つ戻る＋紙面風のテキスト編集。すべて端末内で完結する。
 * 「一つ戻る」は操作（校正・挿入など）単位の巻き戻しで、
 * 文字単位のundo（Ctrl+Z相当）はテキストエリア標準機能に委ねる。
 */
export function ContractEditor({
  value,
  onChange,
  onPdf,
  onSave,
  onCopy,
  undo,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onPdf?: () => void;
  onSave?: () => void;
  onCopy?: () => void;
  undo?: EditorUndoControl;
  className?: string;
}) {
  const { toast } = useToast();
  // undo未指定時の内部フォールバック（1段のみ）
  const [prev, setPrev] = useState<string | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const snapshot = () => {
    if (undo) undo.snapshot();
    else setPrev(value);
  };
  const canUndo = undo ? undo.canUndo : prev != null;
  const doUndo = () => {
    if (undo) {
      undo.onUndo();
      return;
    }
    if (prev != null) onChange(prev);
    setPrev(null);
  };

  const format = () => {
    const next = formatDocument(value);
    if (next === value) {
      toast("整える箇所はありませんでした");
      return;
    }
    snapshot();
    onChange(next);
    toast("校正しました", "success");
  };

  const insert = (body: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const res = insertAtCursor(value, body, start, end);
    snapshot();
    onChange(res.text);
    toast("文書に挿入しました", "success");
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(res.caret, res.caret);
    });
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!value.trim()}
          onClick={format}
          title="表記ゆれ・空白・句読点を端末内で整えます（AIは使いません）"
        >
          <Sparkles aria-hidden /> 校正
        </Button>
        <Button
          variant={showSnippets ? "default" : "outline"}
          size="sm"
          onClick={() => setShowSnippets((v) => !v)}
        >
          <BookText aria-hidden /> 定型文
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canUndo}
          onClick={doUndo}
          title="直前の操作（校正・挿入・AI修正など）を1つ巻き戻します。文字入力の取り消しは Ctrl+Z をお使いください"
        >
          <Undo2 aria-hidden /> 一つ戻る
        </Button>
      </div>

      {showSnippets && (
        <div className="min-h-0 overflow-y-auto border-b border-border px-4 pb-3 pt-1">
          <SnippetPicker onInsert={insert} />
        </div>
      )}

      <div className="min-h-0 flex-1 bg-muted/40 p-4">
        <Textarea
          ref={ref}
          aria-label="契約書エディタ"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ここで文書を編集できます。"
          className="h-full min-h-[24rem] resize-none border-border bg-card font-serif text-[15px] leading-8 shadow-sm"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            disabled={!value.trim()}
            onClick={onSave}
          >
            <Save aria-hidden /> 履歴に保存
          </Button>
        )}
        {onPdf && (
          <Button
            variant="secondary"
            size="sm"
            disabled={!value.trim()}
            onClick={onPdf}
          >
            <FileDown aria-hidden /> PDFで保存
          </Button>
        )}
        <Button
          size="sm"
          disabled={!value.trim()}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            toast("クリップボードにコピーしました", "success");
            onCopy?.();
          }}
        >
          <Copy aria-hidden /> コピー
        </Button>
      </div>
    </div>
  );
}

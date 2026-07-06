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

/**
 * 契約書エディタ（Wordの契約書特化版イメージ）。
 * 清書・定型文挿入・元に戻す＋紙面風のテキスト編集。すべて端末内で完結する。
 */
export function ContractEditor({
  value,
  onChange,
  onPdf,
  onSave,
  onCopy,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onPdf?: () => void;
  onSave?: () => void;
  onCopy?: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const [prev, setPrev] = useState<string | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const format = () => {
    const next = formatDocument(value);
    if (next === value) {
      toast("整える箇所はありませんでした");
      return;
    }
    setPrev(value);
    onChange(next);
    toast("清書しました", "success");
  };

  const insert = (body: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const res = insertAtCursor(value, body, start, end);
    setPrev(value);
    onChange(res.text);
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
        >
          <Sparkles aria-hidden /> 清書
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
          disabled={prev == null}
          onClick={() => {
            if (prev != null) onChange(prev);
            setPrev(null);
          }}
        >
          <Undo2 aria-hidden /> 元に戻す
        </Button>
      </div>

      {showSnippets && (
        <div className="border-b border-border px-4 pb-3 pt-1">
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

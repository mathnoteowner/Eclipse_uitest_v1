"use client";

import { useState } from "react";
import { FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SNIPPET_CATEGORIES, SNIPPETS } from "@/lib/edit/snippets";
import { cn } from "@/lib/utils";

/**
 * 契約定型文の選択パネル。
 * 一覧から選ぶと全文をその場で表示し（途中で切らない）、
 * 「文書に挿入」ボタンでカーソル位置に挿入する。
 * 空欄 〔　〕 は挿入後にユーザーが手で埋める。
 */
export function SnippetPicker({
  onInsert,
}: {
  onInsert: (body: string) => void;
}) {
  const [category, setCategory] = useState<string>(SNIPPET_CATEGORIES[0]);
  const items = SNIPPETS.filter((s) => s.category === category);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="snippet-category"
          className="text-xs font-medium text-muted-foreground"
        >
          分類
        </label>
        <select
          id="snippet-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSelectedId(null);
          }}
          className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {SNIPPET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
        {items.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setSelectedId(s.id)}
              aria-pressed={selectedId === s.id}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                selectedId === s.id
                  ? "border-primary bg-accent/60"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <span className="text-sm font-medium text-foreground">
                {s.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {selected.title} — 全文
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-7 text-foreground">
            {selected.body}
          </p>
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={() => onInsert(selected.body)}>
              <FilePlus aria-hidden /> 文書に挿入
            </Button>
          </div>
        </div>
      )}

      <p className="text-[11px] leading-4 text-muted-foreground">
        定型文は編集の出発点です。内容の適法性・妥当性はご自身でご確認ください。空欄 〔　〕 はご自身の条件に置き換えてください。
      </p>
    </div>
  );
}

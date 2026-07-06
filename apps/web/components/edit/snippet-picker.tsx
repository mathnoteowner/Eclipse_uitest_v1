"use client";

import { useState } from "react";
import { SNIPPET_CATEGORIES, SNIPPETS } from "@/lib/edit/snippets";

/** 契約定型文の選択パネル。クリックでカーソル位置に挿入する。 */
export function SnippetPicker({
  onInsert,
}: {
  onInsert: (body: string) => void;
}) {
  const [category, setCategory] = useState<string>(SNIPPET_CATEGORIES[0]);
  const items = SNIPPETS.filter((s) => s.category === category);

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
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {SNIPPET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <ul className="max-h-60 space-y-1.5 overflow-y-auto">
        {items.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onInsert(s.body)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <span className="text-sm font-medium text-foreground">
                {s.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {s.body}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-4 text-muted-foreground">
        定型文は編集の出発点です。内容の適法性・妥当性はご自身でご確認ください。空欄 〔　〕 はご自身の条件に置き換えてください。
      </p>
    </div>
  );
}

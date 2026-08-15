"use client";

import { useMemo, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENTITY_META, type EntityType } from "@/lib/services/types";
import { splitByPlaceholders, type MaskEntry } from "@/lib/services/mask";
import type { KnownValue } from "@/lib/services/mask/deterministic";

/** 確認画面でマスク追加できる種別（maskAs の宣言可能種別と揃える） */
const ADDABLE_TYPES: EntityType[] = ["ORG", "PERSON", "MONEY", "ADDRESS", "DATE"];

/** マスク済みテキストの全文表示。プレースホルダをハイライトする */
export function MaskedTextView({
  masked,
  className,
}: {
  masked: string;
  className?: string;
}) {
  const segments = useMemo(() => splitByPlaceholders(masked), [masked]);
  return (
    <p className={`whitespace-pre-wrap ${className ?? ""}`}>
      {segments.map((s, i) =>
        s.isPlaceholder ? (
          <mark
            key={i}
            className="mx-0.5 rounded bg-accent px-1 py-0.5 text-[0.9em] font-medium text-accent-foreground underline decoration-primary/40"
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  );
}

/**
 * 送信前マスク確認。
 * - マスク済みテキストを全文表示し、マスクされた語をハイライトする
 * - 検出漏れの語は本文から選択（タップ/ドラッグ）してマスクに追加できる
 * - ここで表示する対応表・原文は端末内のみで扱い、送信ペイロードには含めない
 */
export function MaskConfirm({
  heading = "送信内容の確認",
  description,
  masked,
  entries,
  extraMasks,
  onAddMask,
  onRemoveMask,
  onBack,
  onSubmit,
  submitLabel = "この内容でマスクして送信",
  submitDisabled = false,
}: {
  heading?: string;
  description: string;
  /** マスク適用後の全文 */
  masked: string;
  /** 現時点の対応表エントリ（プレースホルダ→原文） */
  entries: MaskEntry[];
  /** ユーザーが確認画面で追加した語 */
  extraMasks: KnownValue[];
  onAddMask: (v: KnownValue) => void;
  onRemoveMask: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
}) {
  const [selection, setSelection] = useState("");
  const [selType, setSelType] = useState<EntityType>("ORG");
  const bodyRef = useRef<HTMLDivElement>(null);

  const captureSelection = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    // プレースホルダをまたぐ選択・空選択は無視
    if (!text || text.includes("〘") || text.includes("〙")) return;
    if (!bodyRef.current || !sel?.anchorNode) return;
    if (!bodyRef.current.contains(sel.anchorNode)) return;
    setSelection(text.slice(0, 60));
  };

  const addSelection = () => {
    if (!selection) return;
    onAddMask({ value: selection, type: selType });
    setSelection("");
    window.getSelection()?.removeAllRanges();
  };

  return (
    <section className="mt-5 space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <ShieldCheck aria-hidden className="size-5 text-primary" />
          {heading}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div
        ref={bodyRef}
        onMouseUp={captureSelection}
        onTouchEnd={captureSelection}
        className="max-h-80 overflow-y-auto rounded-md border border-border bg-muted/40 p-4"
      >
        <MaskedTextView masked={masked} className="text-sm leading-7" />
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          マスクされていない語が残っている場合は、上の本文でその語を選択（タップ／ドラッグ）して追加してください。
        </p>
        {selection && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="max-w-56 truncate rounded bg-card px-2 py-1 text-xs font-medium text-foreground ring-1 ring-border">
              「{selection}」
            </span>
            <select
              aria-label="マスクの種別"
              value={selType}
              onChange={(e) => setSelType(e.target.value as EntityType)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {ADDABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENTITY_META[t].label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={addSelection}>
              マスクに追加
            </Button>
          </div>
        )}
        {extraMasks.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {extraMasks.map((m) => (
              <li key={`${m.type}:${m.value}`}>
                <button
                  type="button"
                  onClick={() => onRemoveMask(m.value)}
                  title="このマスク追加を取り消す"
                  className="inline-flex items-center gap-1 rounded bg-eclipse px-1.5 py-0.5 text-[11px] font-medium text-eclipse-foreground hover:opacity-80"
                >
                  {m.value}（{ENTITY_META[m.type].label}）
                  <X aria-hidden className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {entries.length > 0 ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            マスクする項目（{entries.length}件）— 対応表は端末内のみ
          </summary>
          <ul className="mt-2 space-y-1.5">
            {entries.map((e) => (
              <li key={e.placeholder} className="flex items-center gap-2">
                <span className="rounded bg-eclipse px-1.5 py-0.5 text-[11px] font-medium text-eclipse-foreground">
                  {e.placeholder}
                </span>
                <span aria-hidden>→</span>
                <span className="text-foreground">{e.original}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-xs text-muted-foreground">
          マスク対象の語はまだありません。必要な語があれば本文から選択して追加してください。
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" onClick={onBack}>
          戻る
        </Button>
        <Button onClick={onSubmit} disabled={submitDisabled}>
          {submitLabel}
        </Button>
      </div>
    </section>
  );
}

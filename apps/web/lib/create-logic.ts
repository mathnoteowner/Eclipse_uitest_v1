import type { FormFieldDef } from "@/lib/doc-forms";
import { detectPII } from "@/lib/services/detection";
import { MaskRegistry, maskText, type MaskEntry } from "@/lib/services/mask";

/** 必須の未入力項目を {key,label} で返す（空白のみも未入力扱い）。 */
export function computeMissing(
  defs: FormFieldDef[],
  values: Record<string, string>,
): { key: string; label: string }[] {
  return defs
    .filter((d) => d.required && !(values[d.key] ?? "").trim())
    .map((d) => ({ key: d.key, label: d.label }));
}

/** 表示テキストの決定：端末内編集があればそれを優先、なければ復元済み原本。 */
export function resolveDisplayedText(
  editedText: string | null,
  restored: string,
): string {
  return editedText ?? restored;
}

/**
 * 補足欄の送信前プレビュー：端末内regex（detectPII）でマスクした結果と対応表。
 * ※NER（人名・社名の高精度検出）は送信時/有料時に適用するため、ここには含めない。
 */
export function buildMaskPreview(note: string): {
  masked: string;
  entries: MaskEntry[];
} {
  const reg = new MaskRegistry();
  const masked = maskText(note, detectPII(note), reg);
  return { masked, entries: reg.list() };
}

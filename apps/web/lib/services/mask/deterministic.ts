import { MaskRegistry, maskText } from "@/lib/services/mask";
import type { EntityType, Span } from "@/lib/services/types";

/**
 * 確定的マスク：maskAs 宣言済みの既知の値だけを見て置換する（NER等の検出を挟まない）。
 * - 同じ文字列には MaskRegistry が必ず同じプレースホルダを割り当てる
 * - 置換は文字列の長い順に行う（「田中」を先に置換すると「田中彩」が壊れるため）
 */
export interface KnownValue {
  value: string;
  type: EntityType;
}

/**
 * 既知の値の出現箇所をスパンとして列挙する。
 * 長い値から順に走査し、先に確保された範囲と重なる出現はスキップする。
 */
export function findKnownValueSpans(
  text: string,
  values: KnownValue[],
): Span[] {
  const cleaned = values
    .map((v) => ({ ...v, value: v.value.trim() }))
    .filter((v) => v.value.length > 0);
  // 長い順。同長は宣言順を維持（sort は安定）
  const sorted = [...cleaned].sort((a, b) => b.value.length - a.value.length);
  const spans: Span[] = [];
  const overlaps = (start: number, end: number) =>
    spans.some((s) => start < s.end && end > s.start);
  for (const { value, type } of sorted) {
    let from = 0;
    for (;;) {
      const at = text.indexOf(value, from);
      if (at < 0) break;
      const end = at + value.length;
      if (!overlaps(at, end)) {
        spans.push({ start: at, end, type, confidence: 1, source: "regex" });
      }
      from = end;
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** 既知の値を確定的にマスクする（自由記述向け） */
export function maskKnownValues(
  text: string,
  values: KnownValue[],
  registry: MaskRegistry,
): string {
  return maskText(text, findKnownValueSpans(text, values), registry);
}

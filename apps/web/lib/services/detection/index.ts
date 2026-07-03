import type { Span } from "@/lib/services/types";
import { DETECTORS } from "./patterns";

type ExecWithIndices = RegExpExecArray & {
  indices?: Array<[number, number] | undefined>;
};

/**
 * 端末内PII検出（正規表現15種）。純粋関数・同期・外部送信なし。
 */
export function detectPII(text: string): Span[] {
  const candidates: Span[] = [];
  for (const det of DETECTORS) {
    det.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = det.regex.exec(text)) !== null) {
      if (m[0].length === 0) {
        det.regex.lastIndex++;
        continue;
      }
      let start = m.index;
      let end = m.index + m[0].length;
      let value = m[0];
      if (det.group != null) {
        const gi = (m as ExecWithIndices).indices?.[det.group];
        if (!gi) continue;
        [start, end] = gi;
        value = text.slice(start, end);
      }
      if (det.validate && !det.validate(value)) continue;
      candidates.push({
        start,
        end,
        type: det.type,
        confidence: det.validate ? 0.99 : 0.9,
        source: "regex",
        kind: det.kind,
      });
    }
  }
  return resolveOverlaps(candidates);
}

const KIND_RANK = new Map(DETECTORS.map((d, i) => [d.kind, i]));

/**
 * 重複スパンの解決。検出器の定義順（＝優先度）が高いものが勝ち、
 * 同順位なら長い方が勝つ。NER由来（rank外）は正規表現より弱い。
 */
export function resolveOverlaps(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => {
    const ra = a.kind != null ? (KIND_RANK.get(a.kind) ?? 90) : 90;
    const rb = b.kind != null ? (KIND_RANK.get(b.kind) ?? 90) : 90;
    if (ra !== rb) return ra - rb;
    return b.end - b.start - (a.end - a.start);
  });
  const kept: Span[] = [];
  for (const s of sorted) {
    if (kept.some((k) => s.start < k.end && k.start < s.end)) continue;
    kept.push(s);
  }
  return kept.sort((a, b) => a.start - b.start);
}

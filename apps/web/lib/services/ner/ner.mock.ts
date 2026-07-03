import type { Span } from "@/lib/services/types";
import type { NerService } from "./index";

const PERSON_RE =
  /[\p{Script=Han}]{1,4}(?:\s?[\p{Script=Han}]{1,4})?(?=\s*(?:様|さま|さん|氏|殿|先生))/gu;

const ORG_RE =
  /(?:株式会社|合同会社|有限会社|一般社団法人|一般財団法人|NPO法人)[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}A-Za-z0-9０-９ー・]{1,20}|[\p{Script=Han}\p{Script=Katakana}A-Za-z0-9０-９ー・]{2,20}(?:株式会社|合同会社|有限会社)/gu;

function collect(text: string, re: RegExp, type: Span["type"], kind: string): Span[] {
  const spans: Span[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      type,
      confidence: 0.85,
      source: "ner",
      kind,
    });
  }
  return spans;
}

/**
 * NERモック。敬称・法人格の手がかりで人名/組織名を近似検出する。
 * GiNZA実装（Phase G）と同じ非同期インターフェース・遅延感を持たせ、
 * UI側の待ち時間設計を本番同等に検証できるようにする。
 */
export class MockNerService implements NerService {
  constructor(private delayMs = 400) {}

  async analyze(text: string): Promise<Span[]> {
    await new Promise((r) => setTimeout(r, this.delayMs));
    return [
      ...collect(text, PERSON_RE, "PERSON", "ner_person"),
      ...collect(text, ORG_RE, "ORG", "ner_org"),
    ];
  }
}

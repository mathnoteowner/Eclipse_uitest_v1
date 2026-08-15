/**
 * 共有リンクの「この内容をもとに書類を作る」導線用の抽出（純粋関数）。
 * 本文から当事者名などを取り出し、書類作成フォームの初期値として渡す。
 * ※この経路は「アップロード由来」として扱い、送信前マスク確認を必ず通す。
 */

export interface ExtractedPrefill {
  values: Record<string, string>;
}

const PATTERNS: { key: string; re: RegExp }[] = [
  // 「株式会社〇〇（以下「甲」という。）」→ 相手方
  { key: "client", re: /(?:^|\n)?([^\n（()）]{2,40})（(?:以下)?「甲」/ },
  // 「委託料は、月額50万円（…」「報酬 月額50万円」
  {
    key: "fee",
    re: /(?:委託料|報酬|金額)[はのを、:：\s]*([^\s、。（(]*(?:円|万円)[^。\n（(]*)/,
  },
  // 「有効期間は、2026年7月1日から3ヶ月間とする」
  { key: "period", re: /有効期間は、?([^。\n]+?)とする/ },
];

/** 本文から当事者名などを抽出する。見つかった項目だけを返す */
export function extractPrefill(text: string): ExtractedPrefill {
  const values: Record<string, string> = {};
  for (const { key, re } of PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      const v = m[1].trim();
      if (v) values[key] = v;
    }
  }
  return { values };
}

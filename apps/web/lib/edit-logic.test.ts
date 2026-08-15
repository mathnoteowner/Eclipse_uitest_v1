import { describe, expect, it } from "vitest";
import { buildEditPayload, buildEditPreview } from "./edit-logic";
import { MASK_TABLE_VERSION, restoreText } from "./services/mask";

const PROFILE = { name: "山田太郎", shopName: "スタジオ・サンプル" };
const DOC =
  "業務委託契約書\n\n株式会社スターワークス（以下「甲」）と山田太郎（以下「乙」）は合意する。";

describe("buildEditPayload（AIへの修正依頼）", () => {
  it("既知の値（プロフィール＋追加語）を本文と指示の両方でマスクする", () => {
    const { input, table } = buildEditPayload(
      DOC,
      "宛名を株式会社スターワークスに統一してください",
      PROFILE,
      [{ value: "株式会社スターワークス", type: "ORG" }],
    );
    expect(input.maskedSource).not.toContain("山田太郎");
    expect(input.maskedSource).not.toContain("スターワークス");
    expect(input.maskedInstruction).not.toContain("スターワークス");
    expect(table.version).toBe(MASK_TABLE_VERSION);
  });

  it("送信ペイロードに原文と対応表が含まれない", () => {
    const { input, table } = buildEditPayload(DOC, "修正して", PROFILE, [
      { value: "株式会社スターワークス", type: "ORG" },
    ]);
    const payload = JSON.stringify(input);
    expect(payload).not.toContain("山田太郎");
    expect(payload).not.toContain("株式会社スターワークス");
    for (const e of table.entries) {
      expect(payload).not.toContain(e.original);
    }
  });

  it("マスク→復元のラウンドトリップで本文が戻る", () => {
    const { input, table } = buildEditPayload(DOC, "修正して", PROFILE, [
      { value: "株式会社スターワークス", type: "ORG" },
    ]);
    const { text, unresolved } = restoreText(
      input.maskedSource ?? "",
      table.entries,
    );
    expect(text).toBe(DOC);
    expect(unresolved).toHaveLength(0);
  });
});

describe("buildEditPreview", () => {
  it("指示と本文を連結した全文プレビューを返す", () => {
    const { masked, entries } = buildEditPreview(DOC, "修正して", PROFILE, []);
    expect(masked).toContain("【修正指示】");
    expect(masked).toContain("【文書本文】");
    expect(masked).not.toContain("山田太郎");
    expect(entries.length).toBeGreaterThan(0);
  });
});

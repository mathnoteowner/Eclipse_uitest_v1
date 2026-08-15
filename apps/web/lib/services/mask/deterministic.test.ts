import { describe, expect, it } from "vitest";
import {
  MASK_TABLE_VERSION,
  MaskRegistry,
  restoreText,
  splitByPlaceholders,
} from "./index";
import { findKnownValueSpans, maskKnownValues } from "./deterministic";

describe("確定的マスク（既知の値のみ・検出なし）", () => {
  it("ラウンドトリップ：マスク→復元で原文に戻る", () => {
    const text =
      "株式会社スターワークスの田中彩様。報酬は月額50万円、期間は2026年7月1日から3ヶ月間。";
    const reg = new MaskRegistry();
    const masked = maskKnownValues(
      text,
      [
        { value: "株式会社スターワークス", type: "ORG" },
        { value: "田中彩", type: "PERSON" },
        { value: "月額50万円", type: "MONEY" },
        { value: "2026年7月1日から3ヶ月間", type: "DATE" },
      ],
      reg,
    );
    expect(masked).not.toContain("スターワークス");
    expect(masked).not.toContain("田中彩");
    expect(masked).not.toContain("50万円");
    const { text: restored, unresolved } = restoreText(masked, reg.list());
    expect(restored).toBe(text);
    expect(unresolved).toHaveLength(0);
  });

  it("マスク網羅：同じ値の複数回出現をすべて置換し、同一トークンを割り当てる", () => {
    const reg = new MaskRegistry();
    const masked = maskKnownValues(
      "田中彩に連絡。請求書の宛名も田中彩とする。",
      [{ value: "田中彩", type: "PERSON" }],
      reg,
    );
    expect(masked).not.toContain("田中彩");
    const tokens = masked.match(/〘[^〘〙]+〙/g) ?? [];
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toBe(tokens[1]);
    expect(reg.size).toBe(1);
  });

  it("境界値：部分文字列を含む語は長い順に置換され取り違えない", () => {
    const reg = new MaskRegistry();
    const masked = maskKnownValues(
      "担当は田中彩。副担当は田中。",
      [
        { value: "田中", type: "PERSON" },
        { value: "田中彩", type: "PERSON" },
      ],
      reg,
    );
    // 「田中彩」が先に（長い順で）置換され、「田中」の置換で壊れないこと
    const { text: restored } = restoreText(masked, reg.list());
    expect(restored).toBe("担当は田中彩。副担当は田中。");
    const entries = reg.list();
    const p彩 = entries.find((e) => e.original === "田中彩")!.placeholder;
    const p田中 = entries.find((e) => e.original === "田中")!.placeholder;
    expect(masked).toBe(`担当は${p彩}。副担当は${p田中}。`);
  });

  it("値の前後空白は無視し、空値は対象にしない", () => {
    const spans = findKnownValueSpans("あいう", [
      { value: "  ", type: "ORG" },
      { value: " あい ", type: "ORG" },
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ start: 0, end: 2 });
  });

  it("重なる出現は長い値を優先し、残りはスキップする", () => {
    const reg = new MaskRegistry();
    const masked = maskKnownValues(
      "株式会社田中設計",
      [
        { value: "田中", type: "PERSON" },
        { value: "株式会社田中設計", type: "ORG" },
      ],
      reg,
    );
    expect(reg.size).toBe(1);
    expect(reg.list()[0].type).toBe("ORG");
    expect(masked).toBe(reg.list()[0].placeholder);
  });
});

describe("対応表の版数", () => {
  it("table() は version を持つ", () => {
    const reg = new MaskRegistry();
    reg.register("田中彩", "PERSON");
    const table = reg.table();
    expect(table.version).toBe(MASK_TABLE_VERSION);
    expect(table.entries).toHaveLength(1);
  });
});

describe("splitByPlaceholders", () => {
  it("プレースホルダと平文に分割する", () => {
    const reg = new MaskRegistry();
    const p = reg.register("田中彩", "PERSON").placeholder;
    const parts = splitByPlaceholders(`担当は${p}です`);
    expect(parts).toEqual([
      { text: "担当は", isPlaceholder: false },
      { text: p, isPlaceholder: true },
      { text: "です", isPlaceholder: false },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { detectPII } from "@/lib/services/detection";
import {
  MaskRegistry,
  maskText,
  maskWholeValue,
  restoreText,
  verifyDraft,
} from "./index";

describe("MaskRegistry", () => {
  it("同一（種別×値）は同一プレースホルダ、別種別は別になる", () => {
    const reg = new MaskRegistry();
    const a = reg.register("田中彩", "PERSON");
    const b = reg.register("田中彩", "PERSON");
    const c = reg.register("田中彩", "ORG");
    expect(a.placeholder).toBe(b.placeholder);
    expect(a.placeholder).not.toBe(c.placeholder);
    expect(reg.size).toBe(2);
  });
});

describe("mask → restore ラウンドトリップ", () => {
  it("検出→マスク→復元で原文に戻る", () => {
    const text =
      "株式会社Aの担当は tanaka@example.com（090-1234-5678）。報酬は月額50万円。";
    const reg = new MaskRegistry();
    const masked = maskText(text, detectPII(text), reg);
    expect(masked).not.toContain("tanaka@example.com");
    expect(masked).not.toContain("090-1234-5678");
    expect(masked).toContain("〘");
    const { text: restored, unresolved } = restoreText(masked, reg.list());
    expect(restored).toBe(text);
    expect(unresolved).toHaveLength(0);
  });

  it("ガイド項目の値全体マスクも復元できる", () => {
    const reg = new MaskRegistry();
    const p1 = maskWholeValue("株式会社スターワークス", "ORG", reg);
    const p2 = maskWholeValue("月額50万円", "MONEY", reg);
    const draft = `甲 ${p1} は乙に対し、報酬 ${p2} を支払う。`;
    const { text, unresolved } = restoreText(draft, reg.list());
    expect(text).toBe(
      "甲 株式会社スターワークス は乙に対し、報酬 月額50万円 を支払う。",
    );
    expect(unresolved).toHaveLength(0);
  });
});

describe("verifyDraft / unresolved 検知", () => {
  it("AIが捏造したプレースホルダを unknown / unresolved として検知する", () => {
    const reg = new MaskRegistry();
    const p = maskWholeValue("田中彩", "PERSON", reg);
    const draft = `${p} と 〘氏名9〙 が登場する。`;
    const verify = verifyDraft(draft, reg.list());
    expect(verify.ok).toBe(false);
    expect(verify.unknown).toContain("〘氏名9〙");
    const { unresolved } = restoreText(draft, reg.list());
    expect(unresolved).toContain("〘氏名9〙");
  });

  it("プレースホルダの欠落を missing として検知する", () => {
    const reg = new MaskRegistry();
    maskWholeValue("田中彩", "PERSON", reg);
    const verify = verifyDraft("プレースホルダなしの文書。", reg.list());
    expect(verify.ok).toBe(false);
    expect(verify.missing).toHaveLength(1);
  });
});

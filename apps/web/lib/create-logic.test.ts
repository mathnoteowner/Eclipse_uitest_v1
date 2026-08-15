import { describe, expect, it } from "vitest";
import {
  buildCreatePayload,
  buildMaskPreview,
  collectKnownValues,
  computeMissing,
  resolveDisplayedText,
} from "./create-logic";
import { DOC_FORMS, validateDocForms, type FormFieldDef } from "./doc-forms";
import { MASK_TABLE_VERSION } from "./services/mask";

const PROFILE = { name: "山田太郎", shopName: "スタジオ・サンプル" };

describe("computeMissing", () => {
  const defs = DOC_FORMS.gyomu_itaku;

  it("必須が空なら欠落として返し、任意項目は含めない", () => {
    const keys = computeMissing(defs, {}).map((m) => m.key);
    expect(keys).toContain("client");
    expect(keys).toContain("fee");
    expect(keys).not.toContain("contact"); // 任意
  });

  it("空白のみは未入力扱い", () => {
    expect(computeMissing(defs, { client: "   " }).map((m) => m.key)).toContain(
      "client",
    );
  });

  it("全必須が埋まれば空", () => {
    const values = Object.fromEntries(
      defs.filter((d) => d.required).map((d) => [d.key, "x"]),
    );
    expect(computeMissing(defs, values)).toHaveLength(0);
  });
});

describe("resolveDisplayedText", () => {
  it("editedText 優先・null なら restored・空編集も尊重", () => {
    expect(resolveDisplayedText("edited", "orig")).toBe("edited");
    expect(resolveDisplayedText(null, "orig")).toBe("orig");
    expect(resolveDisplayedText("", "orig")).toBe("");
  });
});

describe("doc-forms スキーマ検証", () => {
  it("現行スキーマは検証を通過する", () => {
    expect(() => validateDocForms()).not.toThrow();
  });

  it("maskAs の指定漏れを起動時に検出できる", () => {
    const broken = {
      x: [{ key: "a", label: "A" } as unknown as FormFieldDef],
    };
    expect(() => validateDocForms(broken)).toThrow(/maskAs/);
  });

  it("キー重複を検出できる", () => {
    const dup = {
      x: [
        { key: "a", label: "A", maskAs: "none" },
        { key: "a", label: "A2", maskAs: "none" },
      ] as FormFieldDef[],
    };
    expect(() => validateDocForms(dup)).toThrow(/重複/);
  });
});

describe("collectKnownValues", () => {
  it("maskAs 宣言のあるフォーム値とプロフィールと追加語を集める", () => {
    const defs = DOC_FORMS.gyomu_itaku;
    const known = collectKnownValues(
      defs,
      { client: "株式会社スターワークス", scope: "サイト制作" },
      PROFILE,
      [{ value: "大阪支店", type: "ADDRESS" }],
    );
    const values = known.map((k) => k.value);
    expect(values).toContain("株式会社スターワークス");
    expect(values).toContain("山田太郎");
    expect(values).toContain("スタジオ・サンプル");
    expect(values).toContain("大阪支店");
    // maskAs: "none" の項目値はマスク対象の値としては集めない
    expect(values).not.toContain("サイト制作");
  });
});

describe("buildMaskPreview（確定的置換）", () => {
  it("既知の値だけを置換し、対応表を返す", () => {
    const { masked, entries } = buildMaskPreview(
      "請求書の宛名は田中彩様にしてください。",
      [{ value: "田中彩", type: "PERSON" }],
    );
    expect(masked).not.toContain("田中彩");
    expect(masked).toContain("〘");
    expect(entries).toHaveLength(1);
  });

  it("空テキストは空プレビュー", () => {
    expect(buildMaskPreview("", [])).toEqual({ masked: "", entries: [] });
  });
});

describe("buildCreatePayload", () => {
  const defs = DOC_FORMS.gyomu_itaku;
  const values = {
    client: "株式会社スターワークス",
    contact: "田中彩",
    scope: "株式会社スターワークスのサイト制作",
    deliverable: "デザインデータ一式",
    fee: "月額50万円",
    period: "2026年7月1日から3ヶ月間",
  };
  const note = "請求書の宛名は田中彩様に。山田太郎の屋号も記載してください。";

  it("送信ペイロードに原文（PII）と対応表が含まれない", () => {
    const { input, table } = buildCreatePayload(
      "gyomu_itaku",
      defs,
      values,
      note,
      PROFILE,
    );
    const payload = JSON.stringify(input);
    // 原文が含まれないこと
    for (const secret of [
      "株式会社スターワークス",
      "田中彩",
      "月額50万円",
      "2026年7月1日から3ヶ月間",
      "山田太郎",
      "スタジオ・サンプル",
    ]) {
      expect(payload).not.toContain(secret);
    }
    // 対応表（placeholder→original の組）が含まれないこと
    expect(payload).not.toContain("original");
    for (const e of table.entries) {
      expect(payload).not.toContain(e.original);
    }
  });

  it("対応表は version を持ち、復元でフォーム値が戻る", () => {
    const { input, table } = buildCreatePayload(
      "gyomu_itaku",
      defs,
      values,
      note,
      PROFILE,
    );
    expect(table.version).toBe(MASK_TABLE_VERSION);
    expect(input.maskedNote).toBeDefined();
    // maskAs:"none" の項目内に混入した既知の値も置換されている
    expect(input.fields.scope).not.toContain("スターワークス");
    // 同じ値には同じトークン（fields と note で共通）
    const clientToken = input.fields.client;
    expect(input.fields.scope).toContain(clientToken);
  });

  it("確認画面で追加した語（extraMasks）も置換される", () => {
    const { input } = buildCreatePayload(
      "gyomu_itaku",
      defs,
      values,
      "納品先は大阪支店です。",
      PROFILE,
      [{ value: "大阪支店", type: "ADDRESS" }],
    );
    expect(input.maskedNote).not.toContain("大阪支店");
  });

  it("追加指示が空なら maskedNote は含まれない", () => {
    const { input } = buildCreatePayload(
      "gyomu_itaku",
      defs,
      values,
      "   ",
      PROFILE,
    );
    expect(input.maskedNote).toBeUndefined();
  });
});

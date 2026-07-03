import { describe, expect, it } from "vitest";
import {
  buildMaskPreview,
  computeMissing,
  resolveDisplayedText,
} from "./create-logic";
import { DOC_FORMS } from "./doc-forms";

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

describe("buildMaskPreview", () => {
  it("noteのPIIをマスクし対応表を返す", () => {
    const { masked, entries } = buildMaskPreview(
      "連絡は tanaka@example.com（090-1234-5678）まで",
    );
    expect(masked).not.toContain("tanaka@example.com");
    expect(masked).toContain("〘");
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  it("空noteは空プレビュー", () => {
    expect(buildMaskPreview("")).toEqual({ masked: "", entries: [] });
  });
});

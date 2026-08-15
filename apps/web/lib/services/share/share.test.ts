import { describe, expect, it } from "vitest";
import { addDays, shareStatus } from "./index";
import { extractPrefill } from "@/lib/share/extract";

describe("shareStatus（失効判定）", () => {
  const base = {
    expiresAt: "2026-10-14T00:00:00.000Z",
    revoked: false,
  };

  it("期限内は active", () => {
    expect(shareStatus(base, new Date("2026-10-01T00:00:00Z"))).toBe("active");
  });

  it("期限を過ぎたら expired", () => {
    expect(shareStatus(base, new Date("2026-10-15T00:00:00Z"))).toBe("expired");
  });

  it("失効済みは期限に関わらず revoked", () => {
    expect(
      shareStatus({ ...base, revoked: true }, new Date("2026-10-01T00:00:00Z")),
    ).toBe("revoked");
    expect(
      shareStatus({ ...base, revoked: true }, new Date("2027-01-01T00:00:00Z")),
    ).toBe("revoked");
  });
});

describe("addDays", () => {
  it("60日・30日の加算ができる", () => {
    expect(addDays("2026-08-15T00:00:00.000Z", 60)).toBe(
      "2026-10-14T00:00:00.000Z",
    );
    expect(addDays("2026-10-14T00:00:00.000Z", 30)).toBe(
      "2026-11-13T00:00:00.000Z",
    );
  });
});

describe("extractPrefill（引き継ぎ抽出）", () => {
  it("当事者名（甲）・報酬・期間を抽出する", () => {
    const text = [
      "業務委託契約書",
      "",
      "株式会社スターワークス（以下「甲」という。）と山田太郎（以下「乙」という。）とは、次のとおり合意する。",
      "",
      "第3条（委託料）",
      "1　本件業務の委託料は、月額50万円（消費税別）とする。",
      "",
      "第4条（契約期間）",
      "本契約の有効期間は、2026年7月1日から3ヶ月間とする。",
    ].join("\n");
    const { values } = extractPrefill(text);
    expect(values.client).toBe("株式会社スターワークス");
    expect(values.fee).toContain("月額50万円");
    expect(values.period).toBe("2026年7月1日から3ヶ月間");
  });

  it("見つからない項目は含めない", () => {
    const { values } = extractPrefill("ただのメモ");
    expect(values).toEqual({});
  });
});

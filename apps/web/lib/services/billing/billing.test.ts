import { describe, expect, it } from "vitest";
import { normalizeUsage, periodKeyOf } from "./billing.mock";

describe("periodKeyOf", () => {
  it("YYYY-MM 形式で返す（月はゼロ埋め）", () => {
    expect(periodKeyOf(new Date(2026, 6, 3))).toBe("2026-07");
    expect(periodKeyOf(new Date(2026, 0, 1))).toBe("2026-01");
  });

  it("年境界（12月→翌1月）で別キーになる", () => {
    expect(periodKeyOf(new Date(2026, 11, 31))).toBe("2026-12");
    expect(periodKeyOf(new Date(2027, 0, 1))).toBe("2027-01");
  });
});

describe("normalizeUsage", () => {
  it("同一月ならその used を維持する", () => {
    expect(normalizeUsage({ periodKey: "2026-07", used: 3 }, "2026-07")).toEqual({
      periodKey: "2026-07",
      used: 3,
    });
  });

  it("前月の値は used=0 に正規化する（月替りリセット）", () => {
    expect(normalizeUsage({ periodKey: "2026-06", used: 8 }, "2026-07")).toEqual({
      periodKey: "2026-07",
      used: 0,
    });
  });

  it("null / 破損値は used=0 にフォールバックする", () => {
    expect(normalizeUsage(null, "2026-07")).toEqual({
      periodKey: "2026-07",
      used: 0,
    });
    expect(
      normalizeUsage(
        { periodKey: "2026-07", used: NaN as unknown as number },
        "2026-07",
      ),
    ).toEqual({ periodKey: "2026-07", used: 0 });
    expect(
      normalizeUsage({ periodKey: "2026-07", used: -5 }, "2026-07"),
    ).toEqual({ periodKey: "2026-07", used: 0 });
  });
});

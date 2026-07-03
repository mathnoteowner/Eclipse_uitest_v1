import { describe, expect, it } from "vitest";
import { detectPII } from "./index";
import {
  corporateNumberValid,
  luhnValid,
  myNumberValid,
} from "./validators";

function findValidCheckDigit(
  body: string,
  build: (check: number) => string,
  validate: (s: string) => boolean,
): string {
  const hits: string[] = [];
  for (let c = 0; c <= 9; c++) {
    const candidate = build(c);
    if (validate(candidate)) hits.push(candidate);
  }
  expect(hits).toHaveLength(1);
  return hits[0];
}

describe("validators", () => {
  it("Luhn: 既知の有効番号を受理し改変を拒否する", () => {
    expect(luhnValid("4242 4242 4242 4242")).toBe(true);
    expect(luhnValid("4242 4242 4242 4243")).toBe(false);
  });

  it("マイナンバー: 検査数字がちょうど1つ存在する", () => {
    const valid = findValidCheckDigit(
      "12345678901",
      (c) => `12345678901${c}`,
      myNumberValid,
    );
    expect(myNumberValid(valid)).toBe(true);
  });

  it("法人番号: 検査数字がちょうど1つ存在する", () => {
    const valid = findValidCheckDigit(
      "000012050002",
      (c) => `${c}000012050002`,
      corporateNumberValid,
    );
    expect(corporateNumberValid(valid)).toBe(true);
  });
});

describe("detectPII", () => {
  it("メール・電話・金額・日付・住所を検出する", () => {
    const text =
      "連絡先は tanaka@example.com / 090-1234-5678。報酬は月額50万円、開始は2026年7月1日、勤務地は東京都渋谷区神南1-2-3。";
    const spans = detectPII(text);
    const kinds = spans.map((s) => s.kind);
    expect(kinds).toContain("email");
    expect(kinds).toContain("phone");
    expect(kinds).toContain("money");
    expect(kinds).toContain("date");
    expect(kinds).toContain("address");
    for (const s of spans) {
      expect(s.start).toBeGreaterThanOrEqual(0);
      expect(s.end).toBeGreaterThan(s.start);
      expect(s.end).toBeLessThanOrEqual(text.length);
    }
  });

  it("電話番号の内部を郵便番号として二重検出しない", () => {
    const spans = detectPII("電話は090-1234-5678です。");
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe("phone");
  });

  it("郵便番号は〒またはハイフン付きで検出する", () => {
    const spans = detectPII("〒150-0041 東京都渋谷区神南1-2-3");
    const kinds = spans.map((s) => s.kind);
    expect(kinds).toContain("postal");
    expect(kinds).toContain("address");
  });

  it("文脈付き番号（免許証）は数字部分だけをスパンにする", () => {
    const text = "免許証番号: 123456789012 を確認";
    const spans = detectPII(text);
    const lic = spans.find((s) => s.kind === "drivers_license");
    expect(lic).toBeDefined();
    expect(text.slice(lic!.start, lic!.end)).toBe("123456789012");
  });

  it("クレジットカードはLuhn検査を通ったものだけ検出する", () => {
    expect(
      detectPII("カードは 4242-4242-4242-4242 です").some(
        (s) => s.kind === "credit_card",
      ),
    ).toBe(true);
    expect(
      detectPII("カードは 4242-4242-4242-4243 です").some(
        (s) => s.kind === "credit_card",
      ),
    ).toBe(false);
  });

  it("URLとIPを検出する", () => {
    const spans = detectPII("サイトは https://example.com/x で、IPは 192.168.0.1。");
    const kinds = spans.map((s) => s.kind);
    expect(kinds).toContain("url");
    expect(kinds).toContain("ip");
  });
});

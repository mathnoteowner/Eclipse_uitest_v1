import { describe, expect, it } from "vitest";
import {
  breakBeforeArticles,
  collapseBlankLines,
  formatDocument,
  normalizeNewlines,
  normalizeSpaces,
  trimLineEnds,
} from "./format";

describe("normalizeNewlines / trimLineEnds / collapseBlankLines", () => {
  it("CRLF/CR を LF に統一する", () => {
    expect(normalizeNewlines("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("行末の半角/全角空白・タブを除去する", () => {
    expect(trimLineEnds("a  \nb　\nc\t")).toBe("a\nb\nc");
  });

  it("2行以上の空行を1行に圧縮する", () => {
    expect(collapseBlankLines("a\n\n\n\nb")).toBe("a\n\nb");
  });
});

describe("normalizeSpaces", () => {
  it("行中の連続空白を1つにする（全角を含む場合は全角へ）", () => {
    expect(normalizeSpaces("甲は  乙に　　支払う")).toBe(
      "甲は 乙に　支払う",
    );
  });

  it("行頭の字下げは保護する", () => {
    expect(normalizeSpaces("　　一　条件")).toBe("　　一　条件");
  });
});

describe("breakBeforeArticles", () => {
  it("行の途中の「第N条（」の前で改段する", () => {
    expect(breakBeforeArticles("…とする。第2条（定義）本契約において")).toBe(
      "…とする。\n\n第2条（定義）本契約において",
    );
  });

  it("条文参照（第N条に/の）は壊さない", () => {
    const s = "本契約第3条に定めるほか、第4条の規定を適用する。";
    expect(breakBeforeArticles(s)).toBe(s);
  });

  it("既に行頭にある見出しは変更しない", () => {
    const s = "第1条（目的）\n甲は乙に委託する。";
    expect(breakBeforeArticles(s)).toBe(s);
  });
});

describe("formatDocument", () => {
  const messy =
    "\n\n業務委託契約書\r\n\r\n\r\n第1条（目的）  甲は  乙に委託する。第2条（納品）　乙は納品する。  \n\n\n以上\n\n";

  it("統合整形が機能する", () => {
    const out = formatDocument(messy);
    expect(out.startsWith("業務委託契約書")).toBe(true);
    expect(out).toContain("\n\n第2条（納品）");
    expect(out).not.toMatch(/\n{3,}/);
    expect(out.endsWith("以上")).toBe(true);
  });

  it("冪等である（f(f(x)) === f(x)）", () => {
    const once = formatDocument(messy);
    expect(formatDocument(once)).toBe(once);
  });

  it("生成テンプレ形式（行頭の第N条見出し）を壊さない", () => {
    const generated =
      "業務委託契約書\n\n第1条（目的）\n甲は乙に対し、次の業務を委託する。\n\n第2条（納品物）\n乙は納品する。";
    expect(formatDocument(generated)).toBe(generated);
  });

  it("空文字・空白のみでも安全", () => {
    expect(formatDocument("")).toBe("");
    expect(formatDocument("  \n\n　")).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import {
  detectImportKind,
  insertAtCursor,
  isFileTooLarge,
  MAX_IMPORT_BYTES,
} from "./docx";
import { SNIPPET_CATEGORIES, SNIPPETS } from "./snippets";

describe("detectImportKind", () => {
  it("拡張子で判定する（大文字も可）", () => {
    expect(detectImportKind("a.txt")).toBe("txt");
    expect(detectImportKind("A.TXT")).toBe("txt");
    expect(detectImportKind("契約書.docx")).toBe("docx");
  });

  it("MIMEでも判定する（拡張子欠落時）", () => {
    expect(detectImportKind("noext", "text/plain")).toBe("txt");
    expect(
      detectImportKind(
        "noext",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
  });

  it("未対応（.pdf/.doc等）は unsupported", () => {
    expect(detectImportKind("a.pdf")).toBe("unsupported");
    expect(detectImportKind("a.doc")).toBe("unsupported");
  });
});

describe("isFileTooLarge", () => {
  it("境界値: 上限ちょうどは可、超過は不可", () => {
    expect(isFileTooLarge(MAX_IMPORT_BYTES)).toBe(false);
    expect(isFileTooLarge(MAX_IMPORT_BYTES + 1)).toBe(true);
  });
});

describe("insertAtCursor", () => {
  it("空テキストへの挿入は前後パディングなし", () => {
    const r = insertAtCursor("", "条文", 0, 0);
    expect(r.text).toBe("条文");
    expect(r.caret).toBe(2);
  });

  it("段落の途中に挿入すると空行で区切られる", () => {
    const r = insertAtCursor("前文です。後文です。", "第9条（追加）", 5, 5);
    expect(r.text).toBe("前文です。\n\n第9条（追加）\n\n後文です。");
    expect(r.text.slice(r.caret - 1, r.caret)).toBe("）");
  });

  it("既に空行がある位置では余計な改行を足さない", () => {
    const base = "前文\n\n";
    const r = insertAtCursor(base, "条文", base.length, base.length);
    expect(r.text).toBe("前文\n\n条文");
  });

  it("選択範囲は置換される", () => {
    const r = insertAtCursor("AAABBBCCC", "X", 3, 6);
    expect(r.text).toBe("AAA\n\nX\n\nCCC");
  });

  it("範囲外のカーソルはクランプされる", () => {
    const r = insertAtCursor("abc", "X", 99, 999);
    expect(r.text).toBe("abc\n\nX");
  });
});

describe("snippets データ整合", () => {
  it("id は一意", () => {
    const ids = SNIPPETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("category は定義済みカテゴリに含まれ、body は非空", () => {
    for (const s of SNIPPETS) {
      expect(SNIPPET_CATEGORIES).toContain(
        s.category as (typeof SNIPPET_CATEGORIES)[number],
      );
      expect(s.body.trim().length).toBeGreaterThan(0);
    }
  });
});

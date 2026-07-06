import { describe, expect, it } from "vitest";
import { deriveTitle, trimHistory, type HistoryRecord } from "./index";
import { normalizeHistory } from "./history.local";

function rec(id: string): HistoryRecord {
  return {
    id,
    createdAt: "2026-07-01T00:00:00.000Z",
    kind: "create",
    title: `t${id}`,
    text: "x",
  };
}

describe("trimHistory", () => {
  it("上限未満はそのまま", () => {
    const list = [rec("1"), rec("2")];
    expect(trimHistory(list, 5)).toHaveLength(2);
  });

  it("上限超過は末尾（古い方）を落とす", () => {
    const list = [rec("new"), rec("mid"), rec("old")];
    const trimmed = trimHistory(list, 2);
    expect(trimmed.map((r) => r.id)).toEqual(["new", "mid"]);
  });

  it("max=0 なら空", () => {
    expect(trimHistory([rec("1")], 0)).toEqual([]);
  });
});

describe("normalizeHistory", () => {
  it("妥当な配列はそのまま復元する", () => {
    const list = [rec("1")];
    expect(normalizeHistory(JSON.parse(JSON.stringify(list)))).toHaveLength(1);
  });

  it("非配列・nullは空", () => {
    expect(normalizeHistory(null)).toEqual([]);
    expect(normalizeHistory({})).toEqual([]);
    expect(normalizeHistory("x")).toEqual([]);
  });

  it("必須フィールド欠落・不正kindの要素は捨てる", () => {
    const raw = [
      rec("ok"),
      { id: "bad1", createdAt: "x", kind: "create", title: "t" },
      { ...rec("bad2"), kind: "unknown" },
      42,
      null,
    ];
    const out = normalizeHistory(raw);
    expect(out.map((r) => r.id)).toEqual(["ok"]);
  });

  it("不明な docType は undefined に落とす", () => {
    const raw = [{ ...rec("1"), docType: "invalid" }];
    expect(normalizeHistory(raw)[0].docType).toBeUndefined();
  });
});

describe("deriveTitle", () => {
  it("最初の非空行を使う（先頭の空行はスキップ）", () => {
    expect(deriveTitle("\n\n  業務委託契約書\n本文")).toBe("業務委託契約書");
  });

  it("24字を超えると切り詰めて…を付ける", () => {
    const long = "あ".repeat(30);
    const t = deriveTitle(long);
    expect(t.length).toBe(25);
    expect(t.endsWith("…")).toBe(true);
  });

  it("空・空白のみは「無題の文書」", () => {
    expect(deriveTitle("")).toBe("無題の文書");
    expect(deriveTitle("  \n\n  ")).toBe("無題の文書");
  });
});

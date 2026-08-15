import { describe, expect, it } from "vitest";
import { splitArticles } from "./articles";

describe("splitArticles", () => {
  it("「第n条」見出しで条項単位に分割する", () => {
    const text = [
      "業務委託契約書",
      "",
      "前文の説明。",
      "",
      "第1条（目的）",
      "甲は乙に委託する。",
      "",
      "第2条（報酬）",
      "報酬は別途定める。",
      "2 支払期日は月末とする。",
    ].join("\n");
    const articles = splitArticles(text);
    expect(articles).toHaveLength(3);
    expect(articles[0].heading).toBeNull();
    expect(articles[0].body).toContain("前文の説明");
    expect(articles[1].heading).toBe("第1条（目的）");
    expect(articles[1].body).toBe("甲は乙に委託する。");
    expect(articles[2].heading).toBe("第2条（報酬）");
    expect(articles[2].body).toContain("支払期日は月末とする");
    expect(articles.map((a) => a.index)).toEqual([0, 1, 2]);
  });

  it("漢数字・全角数字の見出しも分割する", () => {
    const articles = splitArticles("第一条（目的）\n本文。\n第２条（雑則）\n本文2。");
    expect(articles.map((a) => a.heading)).toEqual([
      "第一条（目的）",
      "第２条（雑則）",
    ]);
  });

  it("行の途中の「第n条」参照では分割しない", () => {
    const articles = splitArticles(
      "第1条（目的）\n本契約第3条に定める事項を含む。",
    );
    expect(articles).toHaveLength(1);
  });

  it("見出しの無い文書は1塊で返す", () => {
    const articles = splitArticles("ただのメモ\n2行目");
    expect(articles).toHaveLength(1);
    expect(articles[0].heading).toBeNull();
  });

  it("空文書は空配列", () => {
    expect(splitArticles("")).toEqual([]);
  });
});

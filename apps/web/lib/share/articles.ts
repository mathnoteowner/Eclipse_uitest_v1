/**
 * 共有リンク閲覧画面の本文分割（純粋関数）。
 * 「第n条」の見出しで自動的に条項単位に分割して表示する。
 */

export interface Article {
  /** 条項見出し（「第1条（目的）」等）。前文・末尾など見出しの無い塊は null */
  heading: string | null;
  body: string;
  /** コメントの紐付けに使う安定索引（0始まり） */
  index: number;
}

const HEADING_RE = /^第[0-9０-９一二三四五六七八九十百]+条.*$/;

/** 本文を「第n条」見出しで条項単位に分割する */
export function splitArticles(text: string): Article[] {
  const lines = text.split("\n");
  const articles: Article[] = [];
  let heading: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").replace(/^\n+|\n+$/g, "");
    if (heading !== null || body.trim()) {
      articles.push({ heading, body, index: articles.length });
    }
    buf = [];
  };

  for (const line of lines) {
    if (HEADING_RE.test(line.trim())) {
      flush();
      heading = line.trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return articles;
}

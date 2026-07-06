/**
 * 契約書テキストのルールベース整形（純粋関数・AI非経由）。
 * 破壊的な変換は formatDocument に集約し、UI側は「整形」ボタンで明示実行＋1段undoを提供する。
 * formatDocument は冪等（f(f(x)) === f(x)）であることをテストで担保する。
 */

/** 改行コードを \n に統一 */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** 各行の行末空白（半角/全角/タブ）を除去 */
export function trimLineEnds(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t　]+$/g, ""))
    .join("\n");
}

/** 3行以上の連続改行（＝2行以上の空行）を空行1行に圧縮 */
export function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * 行中の連続空白を1つに正規化。行頭の字下げ（意図的なインデント）は保護する。
 * 連続空白に全角が含まれる場合は全角1つに寄せる。
 */
export function normalizeSpaces(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(/^[ 　\t]*/);
      const indent = m ? m[0] : "";
      const rest = line.slice(indent.length);
      return (
        indent +
        rest.replace(/[ 　]{2,}/g, (run) =>
          run.includes("　") ? "　" : " ",
        )
      );
    })
    .join("\n");
}

/**
 * 行の途中に現れる条文見出し「第N条（…」の直前で改段する。
 * 「本契約第3条に定める」のような参照を壊さないよう、直後に「（」が続く場合のみ対象。
 * 既に行頭にある見出しは変更しない。
 */
export function breakBeforeArticles(text: string): string {
  return text.replace(
    /([^\n])[ 　]*(第[0-9０-９一二三四五六七八九十百]+条)(?=[（(])/g,
    "$1\n\n$2",
  );
}

/** 統合整形（冪等）。先頭・末尾の余分な空行も除去する。 */
export function formatDocument(text: string): string {
  let out = normalizeNewlines(text);
  out = breakBeforeArticles(out);
  out = normalizeSpaces(out);
  out = trimLineEnds(out);
  out = collapseBlankLines(out);
  out = out.replace(/^\n+/, "").replace(/\n+$/, "");
  return out;
}

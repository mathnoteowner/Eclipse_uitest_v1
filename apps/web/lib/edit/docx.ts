/**
 * 文書取込ユーティリティ（すべて端末内で完結・AI非経由）。
 * .docx の解析は mammoth を動的 import し、初期バンドルに載せない。
 */

export type ImportKind = "txt" | "docx" | "unsupported";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5MB

/** 拡張子・MIME からの取込種別判定。純粋関数 */
export function detectImportKind(fileName: string, mime?: string): ImportKind {
  const name = fileName.toLowerCase();
  if (name.endsWith(".txt") || mime === "text/plain") return "txt";
  if (
    name.endsWith(".docx") ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return "unsupported";
}

/** サイズ上限チェック。純粋関数 */
export function isFileTooLarge(
  size: number,
  max: number = MAX_IMPORT_BYTES,
): boolean {
  return size > max;
}

export interface InsertResult {
  text: string;
  caret: number;
}

/**
 * カーソル位置（選択範囲）に条文テキストを挿入する。純粋関数。
 * 条文としての体裁を保つため、前後を空行1行で区切る（既にある空行は増やさない）。
 */
export function insertAtCursor(
  text: string,
  insert: string,
  selStart: number,
  selEnd: number,
): InsertResult {
  const start = Math.max(0, Math.min(selStart, text.length));
  const end = Math.max(start, Math.min(selEnd, text.length));
  const before = text.slice(0, start);
  const after = text.slice(end);

  let prefix = "";
  if (before.length > 0) {
    if (before.endsWith("\n\n")) prefix = "";
    else if (before.endsWith("\n")) prefix = "\n";
    else prefix = "\n\n";
  }
  let suffix = "";
  if (after.length > 0) {
    if (after.startsWith("\n\n")) suffix = "";
    else if (after.startsWith("\n")) suffix = "\n";
    else suffix = "\n\n";
  }

  const caret = before.length + prefix.length + insert.length;
  return { text: before + prefix + insert + suffix + after, caret };
}

/**
 * .docx から素のテキストを抽出する（mammoth を遅延ロード）。
 * 失敗時は呼び出し側で握って「貼り付け」フォールバックへ誘導する。
 */
export async function extractDocxText(file: File): Promise<string> {
  if (isFileTooLarge(file.size)) {
    throw new Error("ファイルが大きすぎます（上限5MB）。");
  }
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value ?? "";
}

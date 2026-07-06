import type { DocType } from "@/lib/services/types";

/**
 * 利用履歴サービスの境界。
 * ★保存されるのは最終テキストのみ（マスク対応表は保存しない）。
 *   ただし最終テキストは復元後＝実際の氏名・社名を含む。
 *   保存先はこの端末の localStorage のみで、サーバー・別端末には存在しない。
 *   削除で即時に消える。
 */
export interface HistoryRecord {
  id: string;
  /** ISO 8601 */
  createdAt: string;
  kind: "create" | "edit";
  /** create のときのみ */
  docType?: DocType;
  title: string;
  text: string;
}

export type HistoryInput = Omit<HistoryRecord, "id" | "createdAt">;

export interface HistoryService {
  /** 新しい順 */
  list(): HistoryRecord[];
  get(id: string): HistoryRecord | null;
  /** 保存できなかった場合（容量上限等）は null */
  save(input: HistoryInput): HistoryRecord | null;
  remove(id: string): void;
  clear(): void;
}

export const MAX_HISTORY = 50;

/** 件数上限（FIFO・先頭が最新）。純粋関数 */
export function trimHistory(
  list: HistoryRecord[],
  max: number = MAX_HISTORY,
): HistoryRecord[] {
  return list.slice(0, Math.max(0, max));
}

/** 本文からタイトルを導出（最初の非空行・24字まで）。純粋関数 */
export function deriveTitle(text: string): string {
  const firstLine =
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  if (!firstLine) return "無題の文書";
  return firstLine.length > 24 ? `${firstLine.slice(0, 24)}…` : firstLine;
}

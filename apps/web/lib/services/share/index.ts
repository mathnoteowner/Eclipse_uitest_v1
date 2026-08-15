/**
 * 共有リンクサービスの境界。
 * ★サーバー永続化が必要な部分（実装はモック: localStorage）:
 *   - id → 暗号文・有効期限・失効状態の保存/取得
 *   - コメント・返信の保存/取得
 * ★サーバーに置いてはならないもの:
 *   - 復号鍵・IV（URLフラグメントのみ）・本文の平文・タイトルの平文
 * 実サーバー実装に差し替える際もこの interface を維持する。
 */

/** コメントの型（選択式） */
export type CommentType =
  | "number_change"
  | "delete_article"
  | "add_article"
  | "question"
  | "confirmed";

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  number_change: "数値の変更",
  delete_article: "条項の削除",
  add_article: "条項の追加",
  question: "質問",
  confirmed: "確認済み",
};

export interface ShareReply {
  id: string;
  author: string;
  text: string;
  createdAt: string; // ISO 8601
}

export interface ShareComment {
  id: string;
  /** 紐づく条項の索引（splitArticles の index） */
  articleIndex: number;
  type: CommentType;
  author: string;
  text: string;
  createdAt: string; // ISO 8601
  replies: ShareReply[];
}

export interface ShareRecord {
  id: string;
  /** 暗号文（Base64URL）。鍵・IVは含まれず、この記録だけでは復号できない */
  ciphertext: string;
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  revoked: boolean;
  comments: ShareComment[];
}

/** 発行時の有効期限（日）と延長単位（日） */
export const SHARE_EXPIRY_DAYS = 60;
export const SHARE_EXTEND_DAYS = 30;

export type ShareStatus = "active" | "expired" | "revoked";

/** 失効判定（純粋関数）。失効済みが期限切れより優先 */
export function shareStatus(
  record: Pick<ShareRecord, "expiresAt" | "revoked">,
  now: Date,
): ShareStatus {
  if (record.revoked) return "revoked";
  if (now.getTime() > new Date(record.expiresAt).getTime()) return "expired";
  return "active";
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** 発行者の端末内インデックス（タイトルは端末内のみ。サーバーには置かない） */
export interface IssuedShareIndexEntry {
  id: string;
  title: string;
  createdAt: string;
}

/** 共有リンクのid採番（発行側の端末で行い、暗号化ペイロードにも埋めて改ざん検知に使う） */
export function generateShareId(): string {
  const buf = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ShareService {
  /**
   * リンクを発行する。id は発行側で generateShareId() により採番する
   * （暗号化ペイロードに同じ id を埋めるため、暗号化前に確定している必要がある）。
   * 受け取るのは id と暗号文のみ（鍵・IV・平文はこの層に渡さない）。
   */
  create(id: string, ciphertext: string): Promise<ShareRecord>;
  get(id: string): Promise<ShareRecord | null>;
  /** 有効期限を延長する（30日単位） */
  extend(id: string, days?: number): Promise<ShareRecord | null>;
  /** 即時失効させる */
  revoke(id: string): Promise<ShareRecord | null>;
  addComment(
    id: string,
    comment: Omit<ShareComment, "id" | "createdAt" | "replies">,
  ): Promise<ShareRecord | null>;
  addReply(
    id: string,
    commentId: string,
    reply: Omit<ShareReply, "id" | "createdAt">,
  ): Promise<ShareRecord | null>;
  /** 発行者の端末内インデックス（この端末で発行したリンクの一覧） */
  listIssued(): IssuedShareIndexEntry[];
  rememberIssued(entry: IssuedShareIndexEntry): void;
}

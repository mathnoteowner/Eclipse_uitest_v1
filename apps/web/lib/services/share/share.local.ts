import {
  SHARE_EXPIRY_DAYS,
  SHARE_EXTEND_DAYS,
  addDays,
  type IssuedShareIndexEntry,
  type ShareComment,
  type ShareRecord,
  type ShareReply,
  type ShareService,
} from "./index";

const RECORDS_KEY = "shomen.share.records";
const ISSUED_KEY = "shomen.share.issued";

function randomId(bytes = 6): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 共有リンクの localStorage モック実装。
 * ★本来はサーバー側DB（id・暗号文・期限・失効・コメント）に置く部分。
 *   このモックでは同一端末のブラウザ内でのみ開封・コメントできる（デモ動作）。
 *   鍵・IV・平文はこの層に一切渡さない設計は実サーバーと同一。
 */
export class LocalShareService implements ShareService {
  private loadAll(): Record<string, ShareRecord> {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(RECORDS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, ShareRecord>) : {};
    } catch {
      return {};
    }
  }

  private saveAll(records: Record<string, ShareRecord>): boolean {
    try {
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  }

  async create(id: string, ciphertext: string): Promise<ShareRecord> {
    if (!id || !ciphertext) {
      throw new Error("共有リンクを発行できませんでした。");
    }
    const records = this.loadAll();
    if (records[id]) {
      throw new Error("共有リンクを発行できませんでした。");
    }
    const now = new Date().toISOString();
    const record: ShareRecord = {
      id,
      ciphertext,
      createdAt: now,
      expiresAt: addDays(now, SHARE_EXPIRY_DAYS),
      revoked: false,
      comments: [],
    };
    records[record.id] = record;
    if (!this.saveAll(records)) {
      throw new Error("共有リンクを保存できませんでした。");
    }
    return record;
  }

  async get(id: string): Promise<ShareRecord | null> {
    return this.loadAll()[id] ?? null;
  }

  async extend(
    id: string,
    days: number = SHARE_EXTEND_DAYS,
  ): Promise<ShareRecord | null> {
    const records = this.loadAll();
    const record = records[id];
    if (!record) return null;
    record.expiresAt = addDays(record.expiresAt, days);
    this.saveAll(records);
    return record;
  }

  async revoke(id: string): Promise<ShareRecord | null> {
    const records = this.loadAll();
    const record = records[id];
    if (!record) return null;
    record.revoked = true;
    this.saveAll(records);
    return record;
  }

  async addComment(
    id: string,
    comment: Omit<ShareComment, "id" | "createdAt" | "replies">,
  ): Promise<ShareRecord | null> {
    const records = this.loadAll();
    const record = records[id];
    if (!record) return null;
    record.comments.push({
      ...comment,
      id: randomId(6),
      createdAt: new Date().toISOString(),
      replies: [],
    });
    this.saveAll(records);
    return record;
  }

  async addReply(
    id: string,
    commentId: string,
    reply: Omit<ShareReply, "id" | "createdAt">,
  ): Promise<ShareRecord | null> {
    const records = this.loadAll();
    const record = records[id];
    if (!record) return null;
    const comment = record.comments.find((c) => c.id === commentId);
    if (!comment) return null;
    comment.replies.push({
      ...reply,
      id: randomId(6),
      createdAt: new Date().toISOString(),
    });
    this.saveAll(records);
    return record;
  }

  listIssued(): IssuedShareIndexEntry[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(ISSUED_KEY);
      const list = raw ? (JSON.parse(raw) as IssuedShareIndexEntry[]) : [];
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }

  rememberIssued(entry: IssuedShareIndexEntry): void {
    try {
      const list = this.listIssued().filter((e) => e.id !== entry.id);
      window.localStorage.setItem(
        ISSUED_KEY,
        JSON.stringify([entry, ...list]),
      );
    } catch {
      // インデックス保存不可でもリンク自体は有効
    }
  }
}

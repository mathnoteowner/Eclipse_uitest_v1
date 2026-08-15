/**
 * 画面間の引き継ぎ（sessionStorage 経由・この端末内のみ）。
 * - upload: 入口の「既存の書類から作る」→ 修正エディタへの本文引き継ぎ
 * - prefill: 共有リンクの「この内容をもとに書類を作る」→ 作成フォームへの自動入力
 * 読み出しは1回限りで、読んだら直ちに削除する（残留させない）。
 */

const UPLOAD_KEY = "shomen.handoff.upload";
const PREFILL_KEY = "shomen.handoff.prefill";

export interface UploadHandoff {
  text: string;
  fileName: string;
}

export interface PrefillHandoff {
  values: Record<string, string>;
  note?: string;
  /** 引き継ぎ元。"share" は相手側の情報を含むためアップロード由来として扱う */
  origin?: "share";
}

function write(key: string, payload: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ストレージ不可（プライベートモード等）の場合は引き継ぎを諦める
  }
}

function readOnce<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    window.sessionStorage.removeItem(key);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeUploadHandoff(h: UploadHandoff): void {
  write(UPLOAD_KEY, h);
}

export function readUploadHandoff(): UploadHandoff | null {
  const h = readOnce<UploadHandoff>(UPLOAD_KEY);
  return h && typeof h.text === "string" ? h : null;
}

export function writePrefillHandoff(h: PrefillHandoff): void {
  write(PREFILL_KEY, h);
}

export function readHandoffPrefill(): PrefillHandoff | null {
  const h = readOnce<PrefillHandoff>(PREFILL_KEY);
  return h && h.values && typeof h.values === "object" ? h : null;
}

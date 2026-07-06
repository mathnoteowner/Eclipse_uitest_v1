import {
  MAX_HISTORY,
  trimHistory,
  type HistoryInput,
  type HistoryRecord,
  type HistoryService,
} from "./index";

const STORAGE_KEY = "eclipse.history";

/** 保存値の正規化。破損・欠落・不正kindの要素は捨てる。純粋関数 */
export function normalizeHistory(raw: unknown): HistoryRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (
      typeof r.id !== "string" ||
      typeof r.createdAt !== "string" ||
      typeof r.title !== "string" ||
      typeof r.text !== "string"
    ) {
      continue;
    }
    if (r.kind !== "create" && r.kind !== "edit") continue;
    const docType =
      r.docType === "gyomu_itaku" || r.docType === "nda" || r.docType === "hatchu"
        ? r.docType
        : undefined;
    out.push({
      id: r.id,
      createdAt: r.createdAt,
      kind: r.kind,
      docType,
      title: r.title,
      text: r.text,
    });
  }
  return out;
}

function genId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fallthrough
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * localStorage 実装（端末内のみ）。
 * SSR/ビルド時は空として振る舞い、保存失敗（容量上限等）でも機能は継続する。
 */
export class LocalHistoryService implements HistoryService {
  private load(): HistoryRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeHistory(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }

  private persist(list: HistoryRecord[]): boolean {
    if (typeof window === "undefined") return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch {
      return false;
    }
  }

  list(): HistoryRecord[] {
    return this.load();
  }

  get(id: string): HistoryRecord | null {
    return this.load().find((r) => r.id === id) ?? null;
  }

  save(input: HistoryInput): HistoryRecord | null {
    const record: HistoryRecord = {
      id: genId(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    const list = trimHistory([record, ...this.load()], MAX_HISTORY);
    return this.persist(list) ? record : null;
  }

  remove(id: string): void {
    this.persist(this.load().filter((r) => r.id !== id));
  }

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 失敗しても継続
    }
  }
}

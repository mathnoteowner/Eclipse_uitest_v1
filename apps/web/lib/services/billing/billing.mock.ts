import type { BillingService, ConsumeResult, Usage } from "./index";

const STORAGE_KEY = "eclipse.usage";

/** 月次の集計期間キー（YYYY-MM）。純粋関数（テスト対象） */
export function periodKeyOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export interface StoredUsage {
  periodKey: string;
  used: number;
}

/**
 * 保存値を現在月に正規化する。純粋関数（テスト対象）。
 * 月が変わっていれば used=0、破損値も 0 にフォールバック。
 */
export function normalizeUsage(
  stored: StoredUsage | null | undefined,
  nowKey: string,
): StoredUsage {
  if (!stored || stored.periodKey !== nowKey) {
    return { periodKey: nowKey, used: 0 };
  }
  const used = Number.isFinite(stored.used)
    ? Math.max(0, Math.floor(stored.used))
    : 0;
  return { periodKey: nowKey, used };
}

/**
 * Freeプラン相当のモック（AI生成 月10回・localStorage永続）。
 * 状態は localStorage に置き、ページ再読込・月替りにも正しく追従する。
 * 実装は Phase J で Supabase(usage_monthly) に差し替え（同一 interface）。
 */
export class MockBillingService implements BillingService {
  readonly limit = 10;

  private load(): StoredUsage {
    const nowKey = periodKeyOf(new Date());
    if (typeof window === "undefined") return { periodKey: nowKey, used: 0 };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as StoredUsage) : null;
      return normalizeUsage(parsed, nowKey);
    } catch {
      return { periodKey: nowKey, used: 0 };
    }
  }

  private save(u: StoredUsage): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      // 保存不可（プライベートモード等）でも機能は継続
    }
  }

  private toUsage(u: StoredUsage): Usage {
    return { used: u.used, limit: this.limit, periodKey: u.periodKey };
  }

  getUsage(): Usage {
    return this.toUsage(this.load());
  }

  canConsume(): boolean {
    return this.load().used < this.limit;
  }

  consume(): ConsumeResult {
    const u = this.load();
    if (u.used >= this.limit) return { ok: false, usage: this.toUsage(u) };
    const next: StoredUsage = { periodKey: u.periodKey, used: u.used + 1 };
    this.save(next);
    return { ok: true, usage: this.toUsage(next) };
  }

  refund(): void {
    const u = this.load();
    this.save({ periodKey: u.periodKey, used: Math.max(0, u.used - 1) });
  }

  reset(): void {
    this.save({ periodKey: periodKeyOf(new Date()), used: 0 });
  }

  seed(used: number): void {
    const nowKey = periodKeyOf(new Date());
    this.save({
      periodKey: nowKey,
      used: Math.min(this.limit, Math.max(0, Math.floor(used))),
    });
  }
}

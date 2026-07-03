/**
 * 利用量・課金サービスの境界。
 * 実装は Phase J/K で Supabase(usage_daily) + Stripe に差し替える。
 */
export interface Usage {
  used: number;
  limit: number;
}

export interface ConsumeResult {
  ok: boolean;
  usage: Usage;
}

export interface BillingService {
  getUsage(): Usage;
  /** AI生成1回分を消費する。上限到達時は ok=false */
  consume(): ConsumeResult;
  /** プロトタイプ・テスト用リセット */
  reset(): void;
  /** テスト用: 使用済み回数を任意に設定（UTのクォータ到達シナリオ再現） */
  seed?(used: number): void;
}

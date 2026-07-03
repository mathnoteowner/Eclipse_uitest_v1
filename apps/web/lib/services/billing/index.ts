/**
 * 利用量・課金サービスの境界。
 * 実装は Phase J/K で Supabase(usage_monthly) + Stripe に差し替える。
 */
export interface Usage {
  used: number;
  limit: number;
  /** 集計期間キー（YYYY-MM）。月次クォータの単位 */
  periodKey: string;
}

export interface ConsumeResult {
  ok: boolean;
  usage: Usage;
}

export interface BillingService {
  getUsage(): Usage;
  /** 副作用なしの事前チェック（生成前のゲート判定用） */
  canConsume(): boolean;
  /** AI生成1回分を消費する。上限到達時は ok=false */
  consume(): ConsumeResult;
  /** 直前1回分の消費を取り消す（保険） */
  refund(): void;
  /** プロトタイプ・テスト用リセット */
  reset(): void;
  /** テスト用: 使用済み回数を任意に設定（UTのクォータ到達シナリオ再現） */
  seed?(used: number): void;
}

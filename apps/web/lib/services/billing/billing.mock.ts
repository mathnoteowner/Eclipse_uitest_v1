import type { BillingService, ConsumeResult, Usage } from "./index";

/** Freeプラン相当のモック（AI生成 3回/日・メモリ保持） */
export class MockBillingService implements BillingService {
  private used = 0;
  readonly limit = 3;

  getUsage(): Usage {
    return { used: this.used, limit: this.limit };
  }

  consume(): ConsumeResult {
    if (this.used >= this.limit) {
      return { ok: false, usage: this.getUsage() };
    }
    this.used += 1;
    return { ok: true, usage: this.getUsage() };
  }

  reset(): void {
    this.used = 0;
  }

  seed(used: number): void {
    this.used = Math.min(this.limit, Math.max(0, Math.floor(used)));
  }
}

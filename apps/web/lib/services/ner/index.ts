import type { Span } from "@/lib/services/types";

/**
 * 日本語NERサービスの境界。
 * 実装は Phase G で FastAPI + GiNZA（サーバー・本文非保存）に差し替える。
 */
export interface NerService {
  analyze(text: string): Promise<Span[]>;
}

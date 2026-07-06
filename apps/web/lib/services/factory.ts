import type { BillingService } from "./billing";
import { MockBillingService } from "./billing/billing.mock";
import type { GenerationService } from "./generation";
import type { HistoryService } from "./history";
import { LocalHistoryService } from "./history/history.local";
import { MockGenerationService } from "./generation/gen.mock";
import type { NerService } from "./ner";
import { MockNerService } from "./ner/ner.mock";
import { MockProfileService, type ProfileService } from "./profile";

/**
 * サービス注入点。UIはこの factory 経由でのみサービスに触れる。
 * NEXT_PUBLIC_USE_MOCKS=false で実装（Phase G以降で追加）へ切替。
 */
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

function notImplemented(name: string): never {
  throw new Error(`${name} の実装はまだありません（モックを使用してください）`);
}

let ner: NerService | null = null;
let generation: GenerationService | null = null;
let billing: BillingService | null = null;
let profile: ProfileService | null = null;

export function getNerService(): NerService {
  ner ??= useMocks ? new MockNerService() : notImplemented("NerService");
  return ner;
}

export function getGenerationService(): GenerationService {
  generation ??= useMocks
    ? new MockGenerationService()
    : notImplemented("GenerationService");
  return generation;
}

export function getBillingService(): BillingService {
  billing ??= useMocks ? new MockBillingService() : notImplemented("BillingService");
  return billing;
}

export function getProfileService(): ProfileService {
  profile ??= useMocks ? new MockProfileService() : notImplemented("ProfileService");
  return profile;
}

let history: HistoryService | null = null;

/** 履歴は端末内 localStorage 固定（mock/real の区別なし） */
export function getHistoryService(): HistoryService {
  history ??= new LocalHistoryService();
  return history;
}

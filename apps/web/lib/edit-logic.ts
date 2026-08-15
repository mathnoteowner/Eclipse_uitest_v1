import type { GenerateInput } from "@/lib/services/generation";
import {
  MaskRegistry,
  type MaskEntry,
  type MaskTable,
} from "@/lib/services/mask";
import {
  maskKnownValues,
  type KnownValue,
} from "@/lib/services/mask/deterministic";
import type { SelfProfile } from "@/lib/create-logic";

/**
 * 修正画面（AIへの追加指示）のマスク対象値。
 * アップロード由来の文書にはフォーム値が無いため、既知の値は
 * 自分のプロフィール＋確認画面でユーザーが追加した語のみ。
 */
export function collectEditKnownValues(
  profile: SelfProfile | null,
  extraMasks: KnownValue[] = [],
): KnownValue[] {
  const known: KnownValue[] = [];
  if (profile) {
    if (profile.name.trim())
      known.push({ value: profile.name.trim(), type: "PERSON" });
    if (profile.shopName.trim())
      known.push({ value: profile.shopName.trim(), type: "ORG" });
  }
  return [...known, ...extraMasks];
}

export interface EditPreview {
  /** 確認画面に全文表示するマスク済みテキスト（指示＋本文） */
  masked: string;
  entries: MaskEntry[];
}

/** 送信前確認用のマスク済み全文プレビュー（指示と本文を連結して表示） */
export function buildEditPreview(
  docText: string,
  instruction: string,
  profile: SelfProfile | null,
  extraMasks: KnownValue[] = [],
): EditPreview {
  const known = collectEditKnownValues(profile, extraMasks);
  const reg = new MaskRegistry();
  const maskedInstruction = maskKnownValues(instruction.trim(), known, reg);
  const maskedSource = maskKnownValues(docText, known, reg);
  const masked = `【修正指示】\n${maskedInstruction}\n\n【文書本文】\n${maskedSource}`;
  return { masked, entries: reg.list() };
}

export interface EditPayload {
  input: GenerateInput;
  /** マスク対応表（★端末内にのみ保持。input には含めない） */
  table: MaskTable;
}

/**
 * 修正依頼のAI送信ペイロードを組み立てる（純粋関数・テスト対象）。
 * 本文・指示とも既知の値だけを確定的に置換する。
 */
export function buildEditPayload(
  docText: string,
  instruction: string,
  profile: SelfProfile | null,
  extraMasks: KnownValue[] = [],
): EditPayload {
  const known = collectEditKnownValues(profile, extraMasks);
  const reg = new MaskRegistry();
  const maskedInstruction = maskKnownValues(instruction.trim(), known, reg);
  const maskedSource = maskKnownValues(docText, known, reg);
  return {
    input: {
      mode: "edit",
      fields: {},
      maskedSource,
      maskedInstruction,
    },
    table: reg.table(),
  };
}

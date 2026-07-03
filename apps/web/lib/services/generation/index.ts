import type { DocType } from "@/lib/services/types";

/**
 * AI文書生成サービスの境界。
 * 実装は Phase H で Claude API（マスク済みテキストのみ送信）に差し替える。
 * 入力はすべて「マスク済み」であることが前提（この層は生のPIIを扱わない）。
 */
export interface GenerateInput {
  docType: DocType;
  mode: "create" | "edit";
  /** ガイド項目（PII項目の値はプレースホルダ済み） */
  fields: Record<string, string>;
  /** 補足・特記（マスク済み） */
  maskedNote?: string;
  /** 修正対象の原文（マスク済み・editモード） */
  maskedSource?: string;
  /** 修正指示（マスク済み） */
  maskedInstruction?: string;
}

export interface GenerateResult {
  maskedDraft: string;
  model: string;
}

export interface GenerationService {
  generate(input: GenerateInput): Promise<GenerateResult>;
}

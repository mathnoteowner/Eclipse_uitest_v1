import { MASK_AS_ENTITY, type FormFieldDef } from "@/lib/doc-forms";
import type { GenerateInput } from "@/lib/services/generation";
import {
  MaskRegistry,
  maskWholeValue,
  type MaskEntry,
  type MaskTable,
} from "@/lib/services/mask";
import {
  maskKnownValues,
  type KnownValue,
} from "@/lib/services/mask/deterministic";
import type { DocType } from "@/lib/services/types";

/** 必須の未入力項目を {key,label} で返す（空白のみも未入力扱い）。 */
export function computeMissing(
  defs: FormFieldDef[],
  values: Record<string, string>,
): { key: string; label: string }[] {
  return defs
    .filter((d) => d.required && !(values[d.key] ?? "").trim())
    .map((d) => ({ key: d.key, label: d.label }));
}

/** 表示テキストの決定：端末内編集があればそれを優先、なければ復元済み原本。 */
export function resolveDisplayedText(
  editedText: string | null,
  restored: string,
): string {
  return editedText ?? restored;
}

export interface SelfProfile {
  name: string;
  shopName: string;
}

/**
 * マスク対象となる既知の値を集める（確定的マスクの入力）。
 * maskAs 宣言のあるフォーム値＋自分のプロフィール＋ユーザーが確認画面で
 * 追加した語（extraMasks）。検出処理には依存しない。
 */
export function collectKnownValues(
  defs: FormFieldDef[],
  values: Record<string, string>,
  profile: SelfProfile | null,
  extraMasks: KnownValue[] = [],
): KnownValue[] {
  const known: KnownValue[] = [];
  for (const def of defs) {
    if (def.maskAs === "none") continue;
    const raw = (values[def.key] ?? "").trim();
    if (!raw) continue;
    known.push({ value: raw, type: MASK_AS_ENTITY[def.maskAs] });
  }
  if (profile) {
    if (profile.name.trim())
      known.push({ value: profile.name.trim(), type: "PERSON" });
    if (profile.shopName.trim())
      known.push({ value: profile.shopName.trim(), type: "ORG" });
  }
  return [...known, ...extraMasks];
}

/**
 * 自由記述（AIへの追加指示）の送信前プレビュー。
 * 既知の値だけを確定的に置換した結果と、その対応表を返す。
 */
export function buildMaskPreview(
  text: string,
  known: KnownValue[],
): { masked: string; entries: MaskEntry[] } {
  if (!text) return { masked: "", entries: [] };
  const reg = new MaskRegistry();
  const masked = maskKnownValues(text, known, reg);
  return { masked, entries: reg.list() };
}

/**
 * 送信前確認画面の全文プレビュー。
 * フォーム項目のマスク結果と自由記述のマスク結果を、送信される形が
 * 分かるように1つのテキストへまとめる（表示専用。送信には buildCreatePayload を使う）。
 */
export function buildConfirmPreview(
  defs: FormFieldDef[],
  values: Record<string, string>,
  note: string,
  known: KnownValue[],
): { masked: string; entries: MaskEntry[] } {
  const reg = new MaskRegistry();
  const lines: string[] = [];
  for (const def of defs) {
    const raw = (values[def.key] ?? "").trim();
    if (!raw) continue;
    const masked =
      def.maskAs === "none"
        ? maskKnownValues(raw, known, reg)
        : maskWholeValue(raw, MASK_AS_ENTITY[def.maskAs], reg);
    lines.push(`${def.label}: ${masked}`);
  }
  const trimmedNote = note.trim();
  let masked = lines.join("\n");
  if (trimmedNote) {
    const maskedNote = maskKnownValues(trimmedNote, known, reg);
    masked += `${masked ? "\n\n" : ""}【AIへの追加指示】\n${maskedNote}`;
  }
  return { masked, entries: reg.list() };
}

export interface CreatePayload {
  /** AIへ送るペイロード（マスク済みの値のみを含む） */
  input: GenerateInput;
  /** マスク対応表（★端末内にのみ保持。input には含めない） */
  table: MaskTable;
}

/**
 * 新規作成のAI送信ペイロードを組み立てる（純粋関数・テスト対象）。
 * - maskAs 宣言のある項目: 値全体を確定的にマスク
 * - maskAs: "none" の項目・自由記述: 既知の値の出現箇所だけを確定的に置換
 * - 対応表は戻り値 table として分離し、input には一切含めない
 */
export function buildCreatePayload(
  docType: DocType,
  defs: FormFieldDef[],
  values: Record<string, string>,
  note: string,
  profile: SelfProfile | null,
  extraMasks: KnownValue[] = [],
): CreatePayload {
  const reg = new MaskRegistry();
  const known = collectKnownValues(defs, values, profile, extraMasks);
  const fields: Record<string, string> = {};
  if (profile) {
    fields.self = maskWholeValue(profile.name, "PERSON", reg);
    fields.selfShop = maskWholeValue(profile.shopName, "ORG", reg);
  }
  for (const def of defs) {
    const raw = (values[def.key] ?? "").trim();
    if (!raw) continue;
    fields[def.key] =
      def.maskAs === "none"
        ? maskKnownValues(raw, known, reg)
        : maskWholeValue(raw, MASK_AS_ENTITY[def.maskAs], reg);
  }
  const trimmedNote = note.trim();
  const maskedNote = trimmedNote
    ? maskKnownValues(trimmedNote, known, reg)
    : undefined;
  return {
    input: { docType, mode: "create", fields, maskedNote },
    table: reg.table(),
  };
}

import type { DocType, EntityType } from "@/lib/services/types";

/**
 * ガイド入力フォームの項目スキーマ（文書タイプ別）。
 * すべての項目に maskAs（マスク対象の種別）の宣言を必須とする。
 * - "none" 以外: 値全体をその種別として確定的にマスク（検出処理に依存しない）
 * - "none": マスクしない（業務内容などPIIを含まない前提の項目）。
 *   ただし自由記述への混入に備え、他項目の値は自由記述側でも確定的に置換される。
 */
export type MaskAs =
  | "organization"
  | "person"
  | "money"
  | "address"
  | "date"
  | "none";

/** maskAs → 検知エンティティ種別の対応（"none" はマスク対象外） */
export const MASK_AS_ENTITY: Record<Exclude<MaskAs, "none">, EntityType> = {
  organization: "ORG",
  person: "PERSON",
  money: "MONEY",
  address: "ADDRESS",
  date: "DATE",
};

const MASK_AS_VALUES: readonly MaskAs[] = [
  "organization",
  "person",
  "money",
  "address",
  "date",
  "none",
];

export interface FormFieldDef {
  key: string;
  label: string;
  /** マスク対象の種別（必須）。型必須に加え validateDocForms で起動時にも検証する */
  maskAs: MaskAs;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  required?: boolean;
}

export const DOC_FORMS: Record<DocType, FormFieldDef[]> = {
  gyomu_itaku: [
    {
      key: "client",
      label: "クライアント名",
      maskAs: "organization",
      required: true,
      placeholder: "例：株式会社〇〇",
    },
    {
      key: "contact",
      label: "先方担当者名（任意）",
      maskAs: "person",
      placeholder: "例：山田太郎",
    },
    {
      key: "scope",
      label: "業務内容",
      maskAs: "none",
      required: true,
      placeholder: "例：コーポレートサイトのデザインおよび実装",
    },
    {
      key: "deliverable",
      label: "納品物",
      maskAs: "none",
      required: true,
      placeholder: "例：デザインデータ一式、実装済みソースコード",
    },
    {
      key: "fee",
      label: "報酬",
      maskAs: "money",
      required: true,
      placeholder: "例：月額50万円",
    },
    {
      key: "period",
      label: "契約期間",
      maskAs: "date",
      required: true,
      placeholder: "例：2026年7月1日から3ヶ月間",
    },
  ],
  nda: [
    {
      key: "client",
      label: "相手方（会社名・氏名）",
      maskAs: "organization",
      required: true,
      placeholder: "例：株式会社〇〇",
    },
    {
      key: "purpose",
      label: "開示目的",
      maskAs: "none",
      required: true,
      placeholder: "例：Webサイト制作業務の遂行",
    },
    {
      key: "period",
      label: "秘密保持期間",
      maskAs: "date",
      required: true,
      placeholder: "例：契約終了後3年間",
    },
  ],
  hatchu: [
    {
      key: "client",
      label: "発注先（会社名・氏名）",
      maskAs: "organization",
      required: true,
      placeholder: "例：株式会社〇〇",
    },
    {
      key: "item",
      label: "件名",
      maskAs: "none",
      required: true,
      placeholder: "例：ロゴデザイン制作",
    },
    {
      key: "detail",
      label: "内容・仕様",
      maskAs: "none",
      required: true,
      multiline: true,
      placeholder: "例：ロゴ原案3案、修正2回、ai/png納品",
    },
    {
      key: "fee",
      label: "金額",
      maskAs: "money",
      required: true,
      placeholder: "例：150,000円（税別）",
    },
    {
      key: "due",
      label: "納期",
      maskAs: "date",
      required: true,
      placeholder: "例：2026年8月末日",
    },
    {
      key: "payment",
      label: "支払条件（任意）",
      maskAs: "none",
      placeholder: "例：納品月末締め翌月末払い",
    },
  ],
};

/**
 * スキーマ検証：全項目が有効な maskAs を宣言しているかを確認する。
 * TypeScript の型必須に加え、将来スキーマをJSON等の外部データ化した場合の
 * 指定漏れも起動時に検出できるよう、モジュール読込時に必ず実行する。
 */
export function validateDocForms(
  forms: Record<string, FormFieldDef[]> = DOC_FORMS,
): void {
  for (const [docType, defs] of Object.entries(forms)) {
    const seen = new Set<string>();
    for (const def of defs) {
      if (!def.key || seen.has(def.key)) {
        throw new Error(
          `doc-forms: ${docType} の項目キーが重複または空です（key=${def.key}）`,
        );
      }
      seen.add(def.key);
      if (!MASK_AS_VALUES.includes(def.maskAs)) {
        throw new Error(
          `doc-forms: ${docType}.${def.key} の maskAs が未指定または不正です`,
        );
      }
    }
  }
}

// 起動時（モジュール読込時）に検証。指定漏れはここで即座に失敗させる。
validateDocForms();

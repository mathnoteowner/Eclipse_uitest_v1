import type { DocType, EntityType } from "@/lib/services/types";

/**
 * ガイド入力フォームの項目スキーマ（文書タイプ別）。
 * entity 指定あり: 値全体をその種別としてマスク（検出に依存せず確実）。
 * entity 指定なし: 自由記述として端末内検出でPIIのみマスク。
 */
export interface FormFieldDef {
  key: string;
  label: string;
  entity?: EntityType;
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
      entity: "ORG",
      required: true,
      placeholder: "例：株式会社〇〇",
    },
    {
      key: "contact",
      label: "先方担当者名（任意）",
      entity: "PERSON",
      placeholder: "例：山田太郎",
    },
    {
      key: "scope",
      label: "業務内容",
      required: true,
      placeholder: "例：コーポレートサイトのデザインおよび実装",
    },
    {
      key: "deliverable",
      label: "納品物",
      required: true,
      placeholder: "例：デザインデータ一式、実装済みソースコード",
    },
    {
      key: "fee",
      label: "報酬",
      entity: "MONEY",
      required: true,
      placeholder: "例：月額50万円",
    },
    {
      key: "period",
      label: "契約期間",
      entity: "DATE",
      required: true,
      placeholder: "例：2026年7月1日から3ヶ月間",
    },
  ],
  nda: [
    {
      key: "client",
      label: "相手方（会社名・氏名）",
      entity: "ORG",
      required: true,
      placeholder: "例：株式会社〇〇",
    },
    {
      key: "purpose",
      label: "開示目的",
      required: true,
      placeholder: "例：Webサイト制作業務の遂行",
    },
    {
      key: "period",
      label: "秘密保持期間",
      entity: "DATE",
      required: true,
      placeholder: "例：契約終了後3年間",
    },
  ],
  hatchu: [
    {
      key: "client",
      label: "発注先（会社名・氏名）",
      entity: "ORG",
      required: true,
      placeholder: "例：株式会社〇〇",
    },
    {
      key: "item",
      label: "件名",
      required: true,
      placeholder: "例：ロゴデザイン制作",
    },
    {
      key: "detail",
      label: "内容・仕様",
      required: true,
      multiline: true,
      placeholder: "例：ロゴ原案3案、修正2回、ai/png納品",
    },
    {
      key: "fee",
      label: "金額",
      entity: "MONEY",
      required: true,
      placeholder: "例：150,000円（税別）",
    },
    {
      key: "due",
      label: "納期",
      entity: "DATE",
      required: true,
      placeholder: "例：2026年8月末日",
    },
    {
      key: "payment",
      label: "支払条件（任意）",
      placeholder: "例：納品月末締め翌月末払い",
    },
  ],
};

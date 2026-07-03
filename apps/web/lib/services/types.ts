/**
 * Eclipse 共有型定義
 * UI・検知エンジン・モック/実サービスのすべてがこの型に依存する（サービス境界の正本）。
 */

/** 検知対象エンティティの種別 */
export type EntityType =
  | "PERSON"
  | "ORG"
  | "ADDRESS"
  | "EMAIL"
  | "PHONE"
  | "MONEY"
  | "DATE"
  | "ID"
  | "URL";

/** 検出元（端末内正規表現 / サーバーNER） */
export type EntitySource = "regex" | "ner";

/** テキスト中の検出スパン */
export interface Span {
  start: number;
  end: number;
  type: EntityType;
  confidence: number;
  source: EntitySource;
  /** 検出パターンの内部識別子（例: "mynumber", "credit_card"） */
  kind?: string;
}

/** 対応文書種別（v1: 中核3種） */
export type DocType = "gyomu_itaku" | "nda" | "hatchu";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  gyomu_itaku: "業務委託契約書",
  nda: "秘密保持契約書（NDA）",
  hatchu: "発注書",
};

export interface EntityMeta {
  /** UI 表示名 */
  label: string;
  /** プレースホルダ用ラベル（〘氏名1〙等） */
  maskLabel: string;
  /**
   * ハイライト表示用クラス。
   * 配色戦略: 色は種別の区別ではなく「保護対象である」ことだけを表す。
   * 全種別を統一ブルー（accent面＋primary下線）で示し、種別はツールチップ/チップで伝える。
   */
  className: string;
}

const HIGHLIGHT_CLASS = "bg-accent text-accent-foreground decoration-primary";

export const ENTITY_META: Record<EntityType, EntityMeta> = {
  PERSON: { label: "氏名", maskLabel: "氏名", className: HIGHLIGHT_CLASS },
  ORG: { label: "社名・組織", maskLabel: "社名", className: HIGHLIGHT_CLASS },
  ADDRESS: { label: "住所", maskLabel: "住所", className: HIGHLIGHT_CLASS },
  EMAIL: {
    label: "メールアドレス",
    maskLabel: "メール",
    className: HIGHLIGHT_CLASS,
  },
  PHONE: { label: "電話番号", maskLabel: "電話", className: HIGHLIGHT_CLASS },
  MONEY: { label: "金額", maskLabel: "金額", className: HIGHLIGHT_CLASS },
  DATE: { label: "日付", maskLabel: "日付", className: HIGHLIGHT_CLASS },
  ID: { label: "番号・ID", maskLabel: "番号", className: HIGHLIGHT_CLASS },
  URL: { label: "URL", maskLabel: "URL", className: HIGHLIGHT_CLASS },
};

/** マスク用プレースホルダ文字列（LLMが壊しにくい希少記号〘〙を使用） */
export function placeholderFor(type: EntityType, index: number): string {
  return `〘${ENTITY_META[type].maskLabel}${index}〙`;
}

import type { EntityType } from "@/lib/services/types";
import {
  addressLikeValid,
  corporateNumberValid,
  ipValid,
  jpPhoneValid,
  luhnValid,
  myNumberValid,
} from "./validators";

export interface Detector {
  /** 内部識別子 */
  kind: string;
  /** UI上のエンティティ種別 */
  type: EntityType;
  /** g フラグ必須。group を使う場合は d フラグも必須 */
  regex: RegExp;
  /** マスク対象をこのキャプチャグループに限定（文脈語を含めない） */
  group?: number;
  validate?: (matched: string) => boolean;
}

const PREFECTURES =
  "(?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)";

/**
 * 15種の検出器。配列の順序＝重複時の優先順位（先勝ち）。
 * 検査数字を持つものを最優先し、文脈依存の番号 → 汎用パターンの順。
 */
export const DETECTORS: Detector[] = [
  {
    kind: "mynumber",
    type: "ID",
    regex: /(?<![\d-])\d{4}[-\s]?\d{4}[-\s]?\d{4}(?![\d-])/g,
    validate: myNumberValid,
  },
  {
    kind: "credit_card",
    type: "ID",
    regex:
      /(?<![\d-])[3-6]\d{3}(?:[-\s]?\d{4}){3}(?![\d-])|(?<![\d-])[3-6]\d{12,15}(?!\d)/g,
    validate: luhnValid,
  },
  {
    kind: "corporate_number",
    type: "ID",
    regex: /(?<![\d-])\d{13}(?![\d-])/g,
    validate: corporateNumberValid,
  },
  {
    kind: "phone",
    type: "PHONE",
    regex: /(?<![\d-])0\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}(?![\d-])/g,
    validate: jpPhoneValid,
  },
  {
    kind: "drivers_license",
    type: "ID",
    regex: /(?:運転免許証?(?:番号)?|免許証?番号)\s*[:：]?\s*(\d{12})(?!\d)/dg,
    group: 1,
  },
  {
    kind: "health_insurance",
    type: "ID",
    regex:
      /(?:保険者番号|被保険者(?:証)?(?:記号)?(?:・?番号)?|保険証(?:記号・?番号|番号))\s*[:：]?\s*([0-9]{6,8})(?!\d)/dg,
    group: 1,
  },
  {
    kind: "bank_account",
    type: "ID",
    regex: /(?:普通|当座)?\s*口座(?:番号)?\s*[:：]?\s*(\d{6,7})(?!\d)/dg,
    group: 1,
  },
  {
    kind: "passport",
    type: "ID",
    regex: /(?<![A-Za-z0-9])[A-Z]{2}\d{7}(?![A-Za-z0-9])/g,
  },
  {
    kind: "postal",
    type: "ADDRESS",
    regex: /〒\s*\d{3}[-‐−ー]?\d{4}(?!\d)|(?<![\d-])\d{3}[-‐−ー]\d{4}(?![\d-])/g,
  },
  {
    kind: "ip",
    type: "ID",
    regex: /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g,
    validate: ipValid,
  },
  {
    kind: "url",
    type: "URL",
    regex: /https?:\/\/[A-Za-z0-9][^\s<>"'）」』〙]*/g,
  },
  {
    kind: "email",
    type: "EMAIL",
    regex:
      /[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+/g,
  },
  {
    kind: "date",
    type: "DATE",
    regex:
      /(?:\d{4}|令和\d{1,2}|平成\d{1,2}|昭和\d{1,2})年\s*\d{1,2}月(?:\s*\d{1,2}日)?|(?<![\d/.])\d{4}[/.]\d{1,2}[/.]\d{1,2}(?![\d/.])|(?<![\d月/.])\d{1,2}月\d{1,2}日/g,
  },
  {
    kind: "money",
    type: "MONEY",
    regex:
      /[¥￥]\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:万|億|千)?円/g,
  },
  {
    kind: "address",
    type: "ADDRESS",
    regex: new RegExp(
      PREFECTURES +
        "[0-9０-９一二三四五六七八九十\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー－\\-丁目番地号]{2,30}",
      "gu",
    ),
    validate: addressLikeValid,
  },
];

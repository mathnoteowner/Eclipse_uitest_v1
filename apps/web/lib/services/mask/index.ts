import { ENTITY_META, type EntityType, type Span } from "@/lib/services/types";

/** マスク対応表の1エントリ（★ブラウザ内のみで保持し、サーバーへ送らない） */
export interface MaskEntry {
  placeholder: string;
  original: string;
  type: EntityType;
}

const PLACEHOLDER_RE = /〘[^〘〙]{1,15}〙/g;

/**
 * マスク対応表。同一（種別×値）は同一プレースホルダに正規化する。
 */
export class MaskRegistry {
  private entries: MaskEntry[] = [];
  private byKey = new Map<string, MaskEntry>();
  private counters = new Map<EntityType, number>();

  register(original: string, type: EntityType): MaskEntry {
    const key = `${type}:${original}`;
    const hit = this.byKey.get(key);
    if (hit) return hit;
    const n = (this.counters.get(type) ?? 0) + 1;
    this.counters.set(type, n);
    const entry: MaskEntry = {
      placeholder: `〘${ENTITY_META[type].maskLabel}${n}〙`,
      original,
      type,
    };
    this.entries.push(entry);
    this.byKey.set(key, entry);
    return entry;
  }

  list(): MaskEntry[] {
    return [...this.entries];
  }

  get size(): number {
    return this.entries.length;
  }

  reset(): void {
    this.entries = [];
    this.byKey.clear();
    this.counters.clear();
  }
}

/** スパンに基づき本文をマスクする（重複スパンは先勝ち） */
export function maskText(
  text: string,
  spans: Span[],
  registry: MaskRegistry,
): string {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const s of sorted) {
    if (s.start < cursor) continue;
    out += text.slice(cursor, s.start);
    const original = text.slice(s.start, s.end);
    out += registry.register(original, s.type).placeholder;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** 値全体を1つのプレースホルダに置換する（ガイド項目用・検出に依存しない） */
export function maskWholeValue(
  value: string,
  type: EntityType,
  registry: MaskRegistry,
): string {
  const v = value.trim();
  if (!v) return "";
  return registry.register(v, type).placeholder;
}

export interface VerifyResult {
  ok: boolean;
  /** 対応表にあるが生成文書に現れなかったプレースホルダ */
  missing: string[];
  /** 生成文書にあるが対応表にない（AIが捏造した）プレースホルダ */
  unknown: string[];
}

/** 生成文書のプレースホルダ整合性を検証する（復元前チェック） */
export function verifyDraft(draft: string, entries: MaskEntry[]): VerifyResult {
  const found = new Set(draft.match(PLACEHOLDER_RE) ?? []);
  const known = new Set(entries.map((e) => e.placeholder));
  const missing = entries
    .filter((e) => !found.has(e.placeholder))
    .map((e) => e.placeholder);
  const unknown = [...found].filter((p) => !known.has(p));
  return { ok: missing.length === 0 && unknown.length === 0, missing, unknown };
}

export interface RestoreResult {
  text: string;
  /** 復元できず残ったプレースホルダ（AI捏造など） */
  unresolved: string[];
}

/** プレースホルダを元の値へ復元する（★端末内でのみ実行） */
export function restoreText(
  draft: string,
  entries: MaskEntry[],
): RestoreResult {
  let out = draft;
  for (const e of entries) {
    out = out.split(e.placeholder).join(e.original);
  }
  const unresolved = [...new Set(out.match(PLACEHOLDER_RE) ?? [])];
  return { text: out, unresolved };
}

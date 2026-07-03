import { cn } from "@/lib/utils";
import { ENTITY_META, type Span } from "@/lib/services/types";

/**
 * 検出スパンをハイライト表示するテキストビュー。
 * 重複スパンは先頭優先でスキップする。
 */
export function Highlighter({
  text,
  spans,
  className,
}: {
  text: string;
  spans: Span[];
  className?: string;
}) {
  const sorted = [...spans]
    .filter((s) => s.start >= 0 && s.end > s.start && s.end <= text.length)
    .sort((a, b) => a.start - b.start);

  const parts: { key: number; text: string; span?: Span }[] = [];
  let cursor = 0;
  for (const span of sorted) {
    if (span.start < cursor) continue;
    if (span.start > cursor) {
      parts.push({ key: parts.length, text: text.slice(cursor, span.start) });
    }
    parts.push({
      key: parts.length,
      text: text.slice(span.start, span.end),
      span,
    });
    cursor = span.end;
  }
  if (cursor < text.length) {
    parts.push({ key: parts.length, text: text.slice(cursor) });
  }

  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-sm leading-7 text-foreground",
        className,
      )}
    >
      {parts.map((part) =>
        part.span ? (
          <mark
            key={part.key}
            title={`${ENTITY_META[part.span.type].label}（${
              part.span.source === "regex" ? "端末内検出" : "NER検出"
            }）`}
            className={cn(
              "rounded-sm px-0.5 underline decoration-2 underline-offset-2",
              ENTITY_META[part.span.type].className,
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={part.key}>{part.text}</span>
        ),
      )}
    </p>
  );
}

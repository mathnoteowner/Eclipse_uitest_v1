"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  detectImportKind,
  extractDocxText,
  isFileTooLarge,
} from "@/lib/edit/docx";

/**
 * .txt / .docx の取込（ファイル選択＋ドラッグ&ドロップ）。
 * すべて端末内で読み込む。失敗時は貼り付けフォールバックへ誘導。
 */
export function DocumentImporter({
  onImport,
}: {
  onImport: (text: string, fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    const kind = detectImportKind(file.name, file.type);
    if (kind === "unsupported") {
      setError(
        "対応していない形式です（.txt / .docx のみ）。本文欄に直接貼り付けてください。",
      );
      return;
    }
    if (isFileTooLarge(file.size)) {
      setError("ファイルが大きすぎます（上限5MB）。");
      return;
    }
    setBusy(true);
    try {
      const text =
        kind === "txt" ? await file.text() : await extractDocxText(file);
      if (!text.trim()) {
        setError(
          "テキストを取り出せませんでした。本文欄に直接貼り付けてください。",
        );
        return;
      }
      onImport(text, file.name);
    } catch {
      setError(
        "このファイルは読み込めませんでした。本文欄に直接貼り付けてください。",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed px-4 py-3",
          dragOver ? "border-primary bg-accent/50" : "border-border bg-muted/40",
        )}
      >
        <p className="text-xs text-muted-foreground">
          .txt / .docx をここにドロップ（この端末内で読み込みます）
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <FileUp aria-hidden />
          )}
          ファイルを選ぶ
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

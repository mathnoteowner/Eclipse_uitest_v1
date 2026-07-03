"use client";

import { Copy, FileDown, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 完成文書の出力アクション列（コピー / .docx / 修正を依頼）。
 */
export function OutputActions({
  onCopy,
  onDownload,
  onRevise,
  className,
}: {
  onCopy?: () => void;
  onDownload?: () => void;
  onRevise?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant="secondary" size="sm" onClick={onCopy}>
        <Copy aria-hidden /> コピー
      </Button>
      <Button variant="secondary" size="sm" onClick={onDownload}>
        <FileDown aria-hidden /> .docx
      </Button>
      <Button variant="outline" size="sm" onClick={onRevise}>
        <Wand2 aria-hidden /> 修正を依頼
      </Button>
    </div>
  );
}

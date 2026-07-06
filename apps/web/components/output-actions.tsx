"use client";

import { Copy, Pencil, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 完成文書の出口アクション列。並び：編集 → フォームに戻って再生成 → PDF → コピー。
 * 「編集」は端末内での直接編集（右側のドロワーを開く。AI非経由・回数消費なし）。
 */
export function OutputActions({
  onEdit,
  onBackToForm,
  onPdf,
  onCopy,
  className,
}: {
  onEdit?: () => void;
  onBackToForm?: () => void;
  onPdf?: () => void;
  onCopy?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        <Pencil aria-hidden /> 編集
      </Button>
      <Button variant="outline" size="sm" onClick={onBackToForm}>
        <RotateCcw aria-hidden /> フォームに戻って再生成
      </Button>
      <Button variant="secondary" size="sm" onClick={onPdf}>
        <Printer aria-hidden /> PDFで保存
      </Button>
      <Button variant="ghost" size="sm" onClick={onCopy}>
        <Copy aria-hidden /> コピー
      </Button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 右側の編集ドロワー（画面幅の約半分）。
 * 「契約書を作成」「文書を修正」「履歴」の3画面で共通利用する。
 */
export function EditorDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground/20"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-full w-full flex-col bg-card shadow-xl",
          "sm:w-[55%] sm:min-w-[420px] sm:max-w-2xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="編集を閉じる"
            onClick={onClose}
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

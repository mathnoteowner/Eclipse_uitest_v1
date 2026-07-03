import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * ガイド入力用フィールド。ラベル＋入力＋ヒント/エラー。
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
      </div>
      {children}
      {hint && !error && (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs leading-5 text-destructive">{error}</p>}
    </div>
  );
}

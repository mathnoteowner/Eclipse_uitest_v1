import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * ガイド入力用フィールド。ラベル（必須印）＋入力＋ヒント/エラー。
 */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  const errorId = htmlFor ? `${htmlFor}-err` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </Label>
      </div>
      {children}
      {hint && !error && (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

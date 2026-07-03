import { cn } from "@/lib/utils";

/**
 * 利用量メーター（Freeプランの日次クォータ表示）。
 * 80%以上で警告色、上限到達で赤。
 */
export function UsageMeter({
  used,
  limit,
  label = "今月のAI生成",
  className,
}: {
  used: number;
  limit: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const barTone =
    used >= limit ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "tabular-nums",
            used >= limit ? "font-medium text-destructive" : "text-foreground",
          )}
        >
          {used} / {limit} 回
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all", barTone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

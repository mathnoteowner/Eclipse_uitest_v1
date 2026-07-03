import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepState = "done" | "active" | "pending";

/**
 * 処理進行ステッパー（保護 → AI生成 → 復元）。
 * activeIndex が steps.length 以上なら全ステップ完了表示。
 */
export function Stepper({
  steps,
  activeIndex,
  className,
}: {
  steps: string[];
  activeIndex: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center", className)}
      aria-label="処理の進行状況"
    >
      {steps.map((label, i) => {
        const state: StepState =
          i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
        return (
          <Fragment key={label}>
            {i > 0 && (
              <div
                className={cn(
                  "mx-2 h-px w-8",
                  i <= activeIndex ? "bg-primary/50" : "bg-border",
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-medium",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "active" && "border-2 border-primary text-primary",
                  state === "pending" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Check aria-hidden className="size-3" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "text-xs",
                  state === "pending"
                    ? "text-muted-foreground"
                    : "text-foreground",
                  state === "active" && "font-medium",
                )}
              >
                {label}
              </span>
              {state === "active" && (
                <span
                  aria-hidden
                  className="size-1.5 animate-pulse rounded-full bg-primary"
                />
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

import type { ReactNode } from "react";
import { CircleAlert, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function StatusBase({
  icon,
  title,
  description,
  action,
  className,
}: StatusProps & { icon: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function EmptyState(props: StatusProps) {
  return (
    <StatusBase
      {...props}
      icon={<Inbox aria-hidden className="size-6 text-muted-foreground" />}
    />
  );
}

export function ErrorState(props: StatusProps) {
  return (
    <StatusBase
      {...props}
      className={cn("border-destructive/30 bg-destructive/5", props.className)}
      icon={<CircleAlert aria-hidden className="size-6 text-destructive" />}
    />
  );
}

export function LoadingState({
  title = "処理中です…",
  ...props
}: Partial<StatusProps>) {
  return (
    <StatusBase
      {...props}
      title={title}
      icon={
        <Loader2 aria-hidden className="size-6 animate-spin text-primary" />
      }
    />
  );
}

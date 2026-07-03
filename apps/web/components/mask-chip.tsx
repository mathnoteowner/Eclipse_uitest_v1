import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENTITY_META, type EntityType } from "@/lib/services/types";

/**
 * マスク済みプレースホルダの表示チップ（“蝕”モチーフ）。
 * 例: 〘氏名1〙〘金額1〙
 */
export function MaskChip({
  type,
  index = 1,
  className,
}: {
  type: EntityType;
  index?: number;
  className?: string;
}) {
  const meta = ENTITY_META[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-eclipse px-1.5 py-0.5 text-xs font-medium text-eclipse-foreground",
        className,
      )}
    >
      <Moon aria-hidden className="size-3" />
      〘{meta.maskLabel}
      {index}〙
    </span>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CalendarPlus,
  FileText,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/status";
import { useToast } from "@/components/ui/toast";
import { getShareService } from "@/lib/services/factory";
import {
  SHARE_EXTEND_DAYS,
  shareStatus,
  type ShareRecord,
  type ShareStatus,
} from "@/lib/services/share";

interface Row {
  id: string;
  title: string;
  createdAt: string;
  record: ShareRecord | null;
  status: ShareStatus | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const STATUS_LABELS: Record<ShareStatus, string> = {
  active: "有効",
  expired: "期限切れ",
  revoked: "失効済み",
};

/**
 * 発行済み共有リンクの一覧（この端末で発行したもの）。
 * 30日単位の延長・即時失効ができる。タイトルは端末内のみに保存されている。
 */
export default function SharesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    const service = getShareService();
    const issued = service.listIssued();
    const next: Row[] = [];
    for (const entry of issued) {
      const record = await service.get(entry.id);
      next.push({
        ...entry,
        record,
        status: record ? shareStatus(record, new Date()) : null,
      });
    }
    setRows(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const extend = async (id: string) => {
    await getShareService().extend(id, SHARE_EXTEND_DAYS);
    toast(`有効期限を${SHARE_EXTEND_DAYS}日延長しました`, "success");
    await load();
  };

  const revoke = async (id: string) => {
    await getShareService().revoke(id);
    toast("リンクを失効させました", "success");
    await load();
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-bold tracking-tight"
        >
          <FileText aria-hidden className="size-5 text-primary" />
          AI書面くん
        </Link>
      </div>

      <Link
        href="/create"
        className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-3.5" /> 書類の作成に戻る
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        発行済みの共有リンク
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        有効期限は発行から60日です。発行後に延長・失効ができます。
      </p>
      <p className="mt-2 rounded-md border border-warning/40 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        このリンクを失うと、内容は復元できません。リンクのURLはこの一覧には保存されていないため、発行時に相手へ確実に送ってください。
      </p>

      {rows === null ? null : rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="発行済みの共有リンクはありません"
          description="書類の作成結果から「共有リンクを発行」を押すと、ここに表示されます。"
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Link2 aria-hidden className="size-4 text-primary" />
                  {row.title || "無題の書類"}
                </p>
                {row.status && (
                  <span
                    className={
                      row.status === "active"
                        ? "rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground"
                        : "rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                    }
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                発行: {formatDate(row.createdAt)}
                {row.record && (
                  <>
                    ・有効期限: {formatDate(row.record.expiresAt)} まで
                    {row.record.comments.length > 0 && (
                      <>
                        ・コメント{" "}
                        <span className="tnum">
                          {row.record.comments.length}
                        </span>
                        件
                      </>
                    )}
                  </>
                )}
              </p>
              {row.record && row.status !== "revoked" && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void extend(row.id)}
                  >
                    <CalendarPlus aria-hidden /> {SHARE_EXTEND_DAYS}日延長
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void revoke(row.id)}
                  >
                    <Ban aria-hidden /> 今すぐ失効
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

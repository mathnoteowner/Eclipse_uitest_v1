"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Link2, TriangleAlert, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { encryptSharePayload } from "@/lib/share/crypto";
import { getShareService } from "@/lib/services/factory";
import { generateShareId } from "@/lib/services/share";

/**
 * 共有リンクの発行ダイアログ。
 * 既定モード: 端末内で暗号化し、鍵はURLフラグメントのみに載せる
 * （サーバー＝モックDBには id と暗号文だけを保存し、鍵は送らない・保存しない）。
 * 共有リンクは全プランで利用可能（回数消費なし）。
 */
export function ShareDialog({
  open,
  onClose,
  title,
  text,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const issue = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = generateShareId();
      const { fragment, ciphertext } = await encryptSharePayload({
        id,
        title,
        text,
      });
      const service = getShareService();
      await service.create(id, ciphertext);
      service.rememberIssued({
        id,
        title,
        createdAt: new Date().toISOString(),
      });
      // basePath配信（GitHub Pages等）でも解決するよう相対で組み立てる
      const url = new URL(`share/?id=${id}`, new URL("..", window.location.href));
      setIssuedUrl(`${url.toString()}#${fragment}`);
    } catch {
      setError("共有リンクを発行できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setIssuedUrl(null);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="共有リンクの発行"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Link2 aria-hidden className="size-5 text-primary" />
            共有リンク
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {issuedUrl ? (
          <div className="mt-4 space-y-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <Check aria-hidden className="size-4" />
              発行しました。このリンクを相手に送ってください。
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={issuedUrl}
                aria-label="共有リンクURL"
                onFocus={(e) => e.currentTarget.select()}
                className="h-9 w-full rounded-md border border-input bg-muted/40 px-2 text-xs text-foreground"
              />
              <Button
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(issuedUrl);
                  toast("リンクをコピーしました", "success");
                }}
              >
                <Copy aria-hidden /> コピー
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              有効期限は発行から60日です。発行後に延長・失効ができます。
            </p>
            <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              このリンクを失うと、内容は復元できません。
            </p>
            <div className="flex justify-end">
              <Link
                href="/shares"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                発行済みリンクの管理
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              相手は登録不要で、リンクを開くだけで内容を閲覧し、条項ごとにコメントできます。本文はこの端末の中で暗号化され、復号に必要な鍵はリンクの「#」以降にのみ含まれます。この部分はサーバーに送信されないため、サーバー側でこのリンクの内容を復号することはできません。
            </p>
            <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              このリンクを失うと、内容は復元できません。
            </p>
            <details className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none font-medium">
                リンクを失っても開き直せるようにするには（アカウントに保存）
              </summary>
              <div className="mt-2 space-y-1.5 leading-5">
                <p>
                  「アカウントに保存」を選ぶと、ログインすればリンクを失っても開き直せます。その代わり、サーバー側で内容を復号できる状態で保存されるため、「サーバーが中身を読めない」という性質は失われます。
                </p>
                <p>
                  どちらを選んでも、暗号化されていない本文が第三者に公開されることはありません。この機能は現在準備中です。
                </p>
              </div>
            </details>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button variant="ghost" onClick={close}>
                閉じる
              </Button>
              <Button onClick={() => void issue()} disabled={busy || !text.trim()}>
                {busy ? "発行しています…" : "共有リンクを発行"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  FilePlus2,
  FileText,
  MessageSquare,
  Reply,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/status";
import { Skeleton } from "@/components/ui/skeleton";
import { openSharePayload, type SharePayload } from "@/lib/share/crypto";
import { splitArticles } from "@/lib/share/articles";
import { extractPrefill } from "@/lib/share/extract";
import { writePrefillHandoff } from "@/lib/handoff";
import { getShareService } from "@/lib/services/factory";
import {
  COMMENT_TYPE_LABELS,
  shareStatus,
  type CommentType,
  type ShareRecord,
} from "@/lib/services/share";

type ViewState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "notfound" }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "ready"; payload: SharePayload; record: ShareRecord };

const COMMENT_TYPES = Object.keys(COMMENT_TYPE_LABELS) as CommentType[];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 共有リンクの閲覧ページ（登録不要・リンクを開くだけ）。
 * 復号はすべてこの端末内で行う。復号失敗（改ざん・破損）は
 * openSharePayload が必ず Promise の拒否として返すため、
 * ここで画面上の案内に変換する（コンソールへは出さない）。
 */
export default function SharePage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  const load = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") ?? "";
    const fragment = window.location.hash;
    if (!id || !fragment) {
      setState({ kind: "invalid" });
      return;
    }
    try {
      const record = await getShareService().get(id);
      if (!record) {
        setState({ kind: "notfound" });
        return;
      }
      // 開封時に期限切れ・失効済みかを確認し、該当すれば本文を表示しない
      const status = shareStatus(record, new Date());
      if (status === "revoked") {
        setState({ kind: "revoked" });
        return;
      }
      if (status === "expired") {
        setState({ kind: "expired" });
        return;
      }
      const payload = await openSharePayload(fragment, id);
      setState({ kind: "ready", payload, record });
    } catch {
      // 改ざん・破損リンク。詳細はログにも画面にも出さない
      setState({ kind: "invalid" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const articles = useMemo(
    () => (state.kind === "ready" ? splitArticles(state.payload.text) : []),
    [state],
  );

  /** ②本命導線: 本文から当事者名などを抽出して作成フォームへ引き継ぐ */
  const startFromThis = () => {
    if (state.kind !== "ready") return;
    const { values } = extractPrefill(state.payload.text);
    // 相手側の情報を含むため「アップロード由来」として扱い、送信前マスク確認を必ず通す
    writePrefillHandoff({ values, origin: "share" });
    router.push("/create");
  };

  const refreshRecord = useCallback(async () => {
    if (state.kind !== "ready") return;
    const record = await getShareService().get(state.record.id);
    if (record) setState({ kind: "ready", payload: state.payload, record });
  }, [state]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      {/* 導線①: ヘッダーのロゴ */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-bold tracking-tight"
        >
          <FileText aria-hidden className="size-5 text-primary" />
          AI書面くん
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden className="size-4 text-primary" />
          この内容はお使いの端末内で復号されています
        </span>
      </div>

      {state.kind === "loading" && (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {state.kind === "invalid" && (
        <ErrorState
          className="mt-8"
          title="リンクを開けませんでした"
          description="リンクが壊れているか、URLが完全にコピーされていない可能性があります。送り主にリンクの再送を依頼してください。"
        />
      )}

      {state.kind === "notfound" && (
        <ErrorState
          className="mt-8"
          title="リンクが見つかりませんでした"
          description="このリンクは存在しないか、すでに削除されています。"
        />
      )}

      {state.kind === "expired" && (
        <ErrorState
          className="mt-8"
          title="このリンクは期限切れです。"
          description="送り主に新しい共有リンクの発行を依頼してください。"
        />
      )}

      {state.kind === "revoked" && (
        <ErrorState
          className="mt-8"
          title="このリンクは失効しています。"
          description="送り主がこのリンクを失効させました。必要な場合は新しいリンクの発行を依頼してください。"
        />
      )}

      {state.kind === "ready" && (
        <>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            {state.payload.title || "共有された書類"}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock aria-hidden className="size-3.5" />
            有効期限: {formatDate(state.record.expiresAt)} まで（発行から60日）
          </p>

          <div className="mt-5 space-y-4">
            {articles.map((a) => (
              <ArticleBlock
                key={a.index}
                heading={a.heading}
                body={a.body}
                articleIndex={a.index}
                record={state.record}
                onChanged={refreshRecord}
              />
            ))}
          </div>

          {/* 導線②: 本文下の本命CTA */}
          <section className="mt-8 rounded-xl border border-primary/30 bg-accent/40 p-5 text-center">
            <p className="text-sm font-medium text-accent-foreground">
              この書類への返答や、自分側の書類が必要ですか？
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              本文から当事者名などを引き継いで、書類作成をすぐに始められます。
            </p>
            <Button className="mt-3" onClick={startFromThis}>
              <FilePlus2 aria-hidden /> この内容をもとに書類を作る
            </Button>
          </section>

          {/* 導線③: フッターの短い説明 */}
          <footer className="mt-10 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            <p>
              このページは「AI書面くん」の共有リンクです。社名・氏名などを端末内でマスクしてからAIで書類を作成できるサービスです。
              <Link href="/" className="ml-1 text-primary underline">
                詳しく見る
              </Link>
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

/** 条項1つ分の表示＋コメントスレッド */
function ArticleBlock({
  heading,
  body,
  articleIndex,
  record,
  onChanged,
}: {
  heading: string | null;
  body: string;
  articleIndex: number;
  record: ShareRecord;
  onChanged: () => Promise<void>;
}) {
  const comments = record.comments.filter(
    (c) => c.articleIndex === articleIndex,
  );
  const [formOpen, setFormOpen] = useState(false);

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      {heading && (
        <h2 className="text-sm font-bold tracking-tight">{heading}</h2>
      )}
      {body && (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-7">{body}</p>
      )}

      <div className="mt-3 border-t border-border pt-2.5">
        {comments.map((c) => (
          <CommentThread
            key={c.id}
            shareId={record.id}
            comment={c}
            onChanged={onChanged}
          />
        ))}
        {formOpen ? (
          <CommentForm
            shareId={record.id}
            articleIndex={articleIndex}
            onDone={async () => {
              setFormOpen(false);
              await onChanged();
            }}
            onCancel={() => setFormOpen(false)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setFormOpen(true)}
          >
            <MessageSquare aria-hidden /> この条項にコメント
            {comments.length > 0 && (
              <span className="tnum">（{comments.length}）</span>
            )}
          </Button>
        )}
      </div>
    </section>
  );
}

function CommentForm({
  shareId,
  articleIndex,
  onDone,
  onCancel,
}: {
  shareId: string;
  articleIndex: number;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<CommentType>("question");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!author.trim()) {
      setError("お名前を入力してください。");
      return;
    }
    if (type !== "confirmed" && !text.trim()) {
      setError("コメントを入力してください。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await getShareService().addComment(shareId, {
        articleIndex,
        type,
        author: author.trim(),
        text: text.trim(),
      });
      await onDone();
    } catch {
      setError("コメントを送信できませんでした。もう一度お試しください。");
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="コメントの種類"
          value={type}
          onChange={(e) => setType(e.target.value as CommentType)}
          className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {COMMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {COMMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <Input
          aria-label="お名前"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="お名前"
          className="h-8 w-40 text-xs"
        />
      </div>
      <Textarea
        aria-label="コメント"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          type === "confirmed"
            ? "補足があれば入力してください（任意）"
            : "コメントを入力してください"
        }
        className="min-h-16 text-sm"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" disabled={busy} onClick={() => void submit()}>
          コメントする
        </Button>
      </div>
    </div>
  );
}

function CommentThread({
  shareId,
  comment,
  onChanged,
}: {
  shareId: string;
  comment: ShareRecord["comments"][number];
  onChanged: () => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReply = async () => {
    if (!author.trim() || !text.trim()) {
      setError("お名前と返信内容を入力してください。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await getShareService().addReply(shareId, comment.id, {
        author: author.trim(),
        text: text.trim(),
      });
      setReplyOpen(false);
      setAuthor("");
      setText("");
      await onChanged();
    } catch {
      setError("返信を送信できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-2 rounded-md bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
          {COMMENT_TYPE_LABELS[comment.type]}
        </span>
        <span className="font-medium text-foreground">{comment.author}</span>
        <span className="text-muted-foreground">
          {formatDate(comment.createdAt)}
        </span>
      </div>
      {comment.text && (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">
          {comment.text}
        </p>
      )}

      {comment.replies.map((r) => (
        <div
          key={r.id}
          className="mt-2 border-l-2 border-border pl-3 text-sm"
        >
          <p className="text-xs">
            <span className="font-medium text-foreground">{r.author}</span>{" "}
            <span className="text-muted-foreground">
              {formatDate(r.createdAt)}
            </span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap leading-6">{r.text}</p>
        </div>
      ))}

      {replyOpen ? (
        <div className="mt-2 space-y-2">
          <Input
            aria-label="お名前"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="お名前"
            className="h-8 w-40 text-xs"
          />
          <Textarea
            aria-label="返信"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="返信を入力してください"
            className="min-h-14 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReplyOpen(false)}>
              取消
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void submitReply()}>
              返信する
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 text-muted-foreground"
          onClick={() => setReplyOpen(true)}
        >
          <Reply aria-hidden /> 返信
        </Button>
      )}
    </div>
  );
}

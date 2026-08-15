"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  FileText,
  History,
  Link2,
  Pencil,
  PenLine,
  Printer,
  Save,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ContractEditor } from "@/components/contract-editor";
import { DocumentCard } from "@/components/document-card";
import { DocumentImporter } from "@/components/edit/document-importer";
import { EditorDrawer } from "@/components/editor-drawer";
import { Field } from "@/components/field";
import { MaskConfirm } from "@/components/create/mask-confirm";
import { EmptyState, ErrorState } from "@/components/status";
import { ShareDialog } from "@/components/share/share-dialog";
import { UsageMeter } from "@/components/usage-meter";
import { withTimeout } from "@/lib/async";
import { buildEditPayload, buildEditPreview } from "@/lib/edit-logic";
import {
  getBillingService,
  getGenerationService,
  getHistoryService,
  getProfileService,
} from "@/lib/services/factory";
import { deriveTitle } from "@/lib/services/history";
import { restoreText } from "@/lib/services/mask";
import type { KnownValue } from "@/lib/services/mask/deterministic";
import { readUploadHandoff } from "@/lib/handoff";

const GENERATE_TIMEOUT_MS = 30000;
const AUTOSAVE_DEBOUNCE_MS = 800;
const DRAFT_KEY = "shomen.edit.draft";
const UNDO_LIMIT = 50;

type AiPhase = "idle" | "confirm" | "working";

/**
 * 文書修正画面。
 * 直接編集・校正・定型文・一つ戻る・自動保存は端末内で完結する（回数消費なし）。
 * 「AIへ修正を依頼」だけがAIを使う（送信前マスク確認 → 生成 → 端末内で復元、1回消費）。
 * 離脱警告（beforeunload）は使わず、debounce付き自動保存で内容を守る。
 */
export default function EditPage() {
  const { toast } = useToast();
  const [text, setTextRaw] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);

  // AI修正依頼
  const [instruction, setInstruction] = useState("");
  const [extraMasks, setExtraMasks] = useState<KnownValue[]>([]);
  const [aiPhase, setAiPhase] = useState<AiPhase>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [usage, setUsage] = useState(() => getBillingService().getUsage());
  const profile = useMemo(() => getProfileService().get(), []);
  const skipNextAutosave = useRef(true);

  // undoスナップショット用に最新の本文をミラーする（updater内の副作用を避ける）
  const textRef = useRef(text);
  textRef.current = text;

  const setText = useCallback((v: string) => {
    setTextRaw(v);
  }, []);

  // 入口（作成方法の選択）からのアップロード引き継ぎ、なければ自動保存ドラフトを復元
  useEffect(() => {
    const handoff = readUploadHandoff();
    if (handoff?.text.trim()) {
      setTextRaw(handoff.text);
      toast(`「${handoff.fileName}」を読み込みました`, "success");
      return;
    }
    try {
      const draft = window.localStorage.getItem(DRAFT_KEY);
      if (draft?.trim()) setTextRaw(draft);
    } catch {
      // 読み出し不可でも編集は継続できる
    }
    // 初回マウント時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自動保存（debounce）。離脱警告は使わない。
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, text);
        setAutosavedAt(
          new Date().toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch {
        // 保存不可（容量・プライベートモード等）でも編集は継続できる
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  /** 操作（校正・挿入・AI修正）で本文を書き換える直前に現在値を積む */
  const snapshot = useCallback(() => {
    const current = textRef.current;
    setUndoStack((p) => [...p, current].slice(-UNDO_LIMIT));
  }, []);

  const undoOnce = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setTextRaw(last);
  }, [undoStack]);

  const handleImport = (imported: string, fileName: string) => {
    if (text.trim()) snapshot();
    setText(imported);
    toast(`「${fileName}」を読み込みました`, "success");
  };

  /** 履歴へ保存（同一内容の重複保存はしない） */
  const saveToHistory = (announce: boolean) => {
    const t = text.trim();
    if (!t) {
      if (announce) toast("本文が空です", "error");
      return;
    }
    if (t === lastSavedText) {
      if (announce) toast("この内容は保存済みです");
      return;
    }
    const rec = getHistoryService().save({
      kind: "edit",
      title: deriveTitle(t),
      text: t,
    });
    if (rec) {
      setLastSavedText(t);
      if (announce) toast("履歴に保存しました", "success");
    } else if (announce) {
      toast("履歴を保存できませんでした（容量上限の可能性）", "error");
    }
  };

  const aiPreview = useMemo(
    () =>
      aiPhase === "confirm"
        ? buildEditPreview(text, instruction, profile, extraMasks)
        : null,
    [aiPhase, text, instruction, profile, extraMasks],
  );

  const quotaExhausted = usage.used >= usage.limit;

  const requestAiEdit = () => {
    if (!text.trim() || !instruction.trim() || quotaExhausted) return;
    setAiError(null);
    // アップロード由来の文書を送るため、必ず送信前マスク確認を挟む
    setAiPhase("confirm");
  };

  const runAiEdit = useCallback(async () => {
    const billing = getBillingService();
    if (!billing.canConsume()) {
      setUsage(billing.getUsage());
      setAiPhase("idle");
      return;
    }
    setAiPhase("working");
    // ★仮消費：失敗時は catch で払い戻す
    const consumed = billing.consume();
    setUsage(consumed.usage);
    try {
      const { input, table } = buildEditPayload(
        text,
        instruction,
        profile,
        extraMasks,
      );
      const gen = await withTimeout(
        getGenerationService().generate(input),
        GENERATE_TIMEOUT_MS,
      );
      // 端末内で復元
      const { text: restored } = restoreText(gen.maskedDraft, table.entries);
      snapshot();
      setTextRaw(restored);
      getHistoryService().save({
        kind: "edit",
        title: deriveTitle(restored),
        text: restored,
      });
      setInstruction("");
      setExtraMasks([]);
      setAiPhase("idle");
      toast("修正案を反映しました。「一つ戻る」で取り消せます。", "success");
    } catch {
      // ★失敗時は払い戻す（回数を消費しない）
      billing.refund();
      setUsage(billing.getUsage());
      setAiPhase("idle");
      setAiError(
        "生成に失敗しました。回数は消費されていないため、そのまま再試行できます。",
      );
    }
  }, [extraMasks, instruction, profile, snapshot, text, toast]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="no-print">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-bold tracking-tight"
          >
            <FileText aria-hidden className="size-5 text-primary" />
            AI書面くん
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/history"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <History aria-hidden /> 履歴
            </Link>
            <div className="w-40">
              <UsageMeter used={usage.used} limit={usage.limit} />
            </div>
          </div>
        </div>

        <Link
          href="/create"
          className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-3.5" /> 書類の作成に戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">文書を修正</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          直接編集・校正・定型文は、この端末の中だけで完結します（回数消費なし）。
        </p>

        {aiPhase === "confirm" && aiPreview ? (
          <MaskConfirm
            heading="送信内容の確認（AIへ修正を依頼）"
            description="アップロード由来の文書を送るため、送信前に必ず内容を確認してください。マスクされた語はハイライトされています。"
            masked={aiPreview.masked}
            entries={aiPreview.entries}
            extraMasks={extraMasks}
            onAddMask={(v) => setExtraMasks((p) => [...p, v])}
            onRemoveMask={(value) =>
              setExtraMasks((p) => p.filter((m) => m.value !== value))
            }
            onBack={() => setAiPhase("idle")}
            onSubmit={() => void runAiEdit()}
          />
        ) : aiPhase === "working" ? (
          <section className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12">
            <Sparkles aria-hidden className="size-6 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">
              マスク済みテキストから修正案を生成しています…
            </p>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
              <DocumentImporter onImport={handleImport} />
            </section>

            {text.trim() ? (
              <>
                <DocumentCard
                  title="編集中の文書"
                  className="mt-5"
                  actions={
                    <div className="flex w-full flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {autosavedAt
                          ? `自動保存済み（${autosavedAt}・この端末内）`
                          : "編集すると自動保存されます（この端末内）"}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditorOpen(true)}
                        >
                          <Pencil aria-hidden /> 編集
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            saveToHistory(false);
                            setShareOpen(true);
                          }}
                        >
                          <Link2 aria-hidden /> 共有リンクを発行
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveToHistory(true)}
                        >
                          <Save aria-hidden /> 履歴に保存
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            saveToHistory(false);
                            window.print();
                          }}
                        >
                          <Printer aria-hidden /> PDFで保存
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            await navigator.clipboard.writeText(text);
                            saveToHistory(false);
                            toast("クリップボードにコピーしました", "success");
                          }}
                        >
                          <Copy aria-hidden /> コピー
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <div className="no-print whitespace-pre-wrap">{text}</div>
                  <div className="print-target hidden whitespace-pre-wrap print:block">
                    {text}
                  </div>
                </DocumentCard>

                <section className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
                  <h2 className="text-base font-bold tracking-tight">
                    AIへ修正を依頼
                  </h2>
                  <Field
                    label="修正の指示"
                    htmlFor="f-instruction"
                    className="mt-3"
                    hint="送信前に確認画面が表示され、マスクされる内容を確かめられます。個別の法的助言ではありません。"
                  >
                    <Textarea
                      id="f-instruction"
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="「支払サイトを翌月末払いに変更してください」「損害賠償の上限を委託料総額にしてください」"
                    />
                  </Field>
                  {quotaExhausted && (
                    <p className="mt-3 text-sm text-amber-900">
                      今月の無料枠（AI生成 {usage.limit}回）を使い切りました。
                    </p>
                  )}
                  {aiError && (
                    <ErrorState
                      className="mt-3"
                      title="生成できませんでした"
                      description={aiError}
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={requestAiEdit}
                        >
                          再試行
                        </Button>
                      }
                    />
                  )}
                  <div className="mt-4 flex justify-end border-t border-border pt-4">
                    <Button
                      disabled={
                        !instruction.trim() || !text.trim() || quotaExhausted
                      }
                      onClick={requestAiEdit}
                    >
                      マスクして修正を依頼
                      <span className="tnum rounded bg-primary-foreground/15 px-1.5 py-0.5 text-[11px] font-normal">
                        AI生成 1回
                      </span>
                    </Button>
                  </div>
                </section>
              </>
            ) : (
              <EmptyState
                className="mt-5"
                title="編集する文書がまだありません"
                description="上でファイルを取り込むか、白紙から書き始められます。"
                action={
                  <Button size="sm" onClick={() => setEditorOpen(true)}>
                    <PenLine aria-hidden /> 白紙から編集を始める
                  </Button>
                }
              />
            )}
          </>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={deriveTitle(text)}
        text={text}
      />

      <EditorDrawer
        open={editorOpen}
        title="文書を編集"
        onClose={() => setEditorOpen(false)}
      >
        <ContractEditor
          value={text}
          onChange={setText}
          undo={{
            canUndo: undoStack.length > 0,
            onUndo: undoOnce,
            snapshot,
          }}
          onSave={() => saveToHistory(true)}
          onCopy={() => saveToHistory(false)}
          onPdf={() => {
            saveToHistory(false);
            window.print();
          }}
        />
      </EditorDrawer>
    </main>
  );
}

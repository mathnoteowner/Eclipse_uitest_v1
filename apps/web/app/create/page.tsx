"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FilePlus2,
  FileText,
  FileUp,
  History,
  ListChecks,
  RotateCcw,
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
import { OutputActions } from "@/components/output-actions";
import { Stepper } from "@/components/stepper";
import { UsageMeter } from "@/components/usage-meter";
import { ErrorState } from "@/components/status";
import { GuidedFields } from "@/components/create/guided-fields";
import { DOC_FORMS } from "@/lib/doc-forms";
import { withTimeout } from "@/lib/async";
import {
  buildCreatePayload,
  buildMaskPreview,
  collectKnownValues,
  computeMissing,
  resolveDisplayedText,
} from "@/lib/create-logic";
import {
  getBillingService,
  getGenerationService,
  getHistoryService,
  getProfileService,
} from "@/lib/services/factory";
import { restoreText, verifyDraft, type MaskEntry } from "@/lib/services/mask";
import type { KnownValue } from "@/lib/services/mask/deterministic";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/services/types";
import { readHandoffPrefill, writeUploadHandoff } from "@/lib/handoff";

const STEPS = ["マスク", "AI生成", "復元"];
const DOC_TYPE_STORAGE_KEY = "eclipse.docType";
const GENERATE_TIMEOUT_MS = 30000;

const DOC_TYPE_DESCRIPTIONS: Record<DocType, string> = {
  gyomu_itaku: "業務の内容・報酬・期間を定める基本の契約書です。",
  nda: "秘密情報の取り扱いを定める契約書です。",
  hatchu: "件名・金額・納期を伝える発注のための書面です。",
};

type Step = "type" | "method" | "input" | "confirm" | "working" | "done";

interface ResultState {
  title: string;
  restored: string;
  entries: MaskEntry[];
  unresolved: string[];
  maskedDraft: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CreatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [docType, setDocType] = useState<DocType | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [extraMasks, setExtraMasks] = useState<KnownValue[]>([]);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ResultState | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState(() => getBillingService().getUsage());
  // 配布版はテスター向けに既定で開発マーカー非表示。開発時は ?present=0 で表示。
  const [presentMode, setPresentMode] = useState(true);
  const [cameFromResult, setCameFromResult] = useState(false);
  const tableRef = useRef<MaskEntry[] | null>(null);
  const forceFailRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("present") === "0") setPresentMode(false);
    else if (params.get("present") === "1") setPresentMode(true);
    forceFailRef.current = params.get("fail") === "1";
    const used = params.get("used");
    if (used != null) {
      const n = Number(used);
      if (Number.isFinite(n)) {
        const billing = getBillingService();
        billing.seed?.(n);
        setUsage(billing.getUsage());
      }
    }
    // 共有リンクからの引き継ぎ（アップロード由来として扱う）
    const prefill = readHandoffPrefill();
    if (prefill) {
      setValues((p) => ({ ...p, ...prefill.values }));
      if (prefill.note) setNote(prefill.note);
    }
  }, []);

  // フォームに戻って再生成で戻ってきた時のみ、追加指示欄へフォーカス。
  useEffect(() => {
    if (step === "input" && cameFromResult) {
      document.getElementById("f-note")?.focus();
      setCameFromResult(false);
    }
  }, [step, cameFromResult]);

  const defs = useMemo(() => (docType ? DOC_FORMS[docType] : []), [docType]);
  const profile = useMemo(() => getProfileService().get(), []);
  const knownValues = useMemo(
    () => collectKnownValues(defs, values, profile, extraMasks),
    [defs, values, profile, extraMasks],
  );
  const notePreview = useMemo(
    () => buildMaskPreview(note.trim(), knownValues),
    [note, knownValues],
  );
  const quotaExhausted = usage.used >= usage.limit;
  const displayedText = result
    ? resolveDisplayedText(editedText, result.restored)
    : "";

  const chooseDocType = (t: DocType) => {
    setDocType(t);
    setErrors({});
    window.localStorage.setItem(DOC_TYPE_STORAGE_KEY, t);
    setStep("method");
  };

  const onFieldChange = (key: string, value: string) => {
    setValues((p) => ({ ...p, [key]: value }));
    if (errors[key]) {
      setErrors((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    }
  };

  const resetAll = useCallback(() => {
    setStep("type");
    setDocType(null);
    setResult(null);
    setError(null);
    setErrors({});
    setExtraMasks([]);
    setEditorOpen(false);
    setEditedText(null);
    tableRef.current = null;
  }, []);

  const backToForm = useCallback(() => {
    setStep("input");
    setEditorOpen(false);
    setEditedText(null);
    setError(null);
    setCameFromResult(true); // 追加指示欄にフォーカス
  }, []);

  const run = useCallback(async () => {
    if (step === "working" || !docType) return;
    const billing = getBillingService();
    if (!billing.canConsume()) {
      setUsage(billing.getUsage());
      setStep("input");
      return;
    }
    setError(null);
    setStep("working");
    setStage(0);
    try {
      const title = DOC_TYPE_LABELS[docType];
      // 確定的マスク：maskAs 宣言済みの値だけを置換（検出処理なし）
      const { input, table } = buildCreatePayload(
        docType,
        defs,
        values,
        note,
        profile,
        extraMasks,
      );
      await sleep(500);

      setStage(1);
      if (forceFailRef.current) {
        throw new Error("生成に失敗しました（テスト用 ?fail=1）。");
      }
      const gen = await withTimeout(
        getGenerationService().generate(input),
        GENERATE_TIMEOUT_MS,
      );

      setStage(2);
      const verify = verifyDraft(gen.maskedDraft, table.entries);
      const { text: restored, unresolved } = restoreText(
        gen.maskedDraft,
        table.entries,
      );
      await sleep(450);

      // ★消費は生成成功後（失敗時は消費しない）
      const consumed = billing.consume();
      setUsage(consumed.usage);
      // ★履歴へ自動保存（端末内のみ・対応表は保存しない）
      getHistoryService().save({
        kind: "create",
        docType,
        title,
        text: restored,
      });
      tableRef.current = table.entries;
      setResult({
        title,
        restored,
        entries: table.entries,
        unresolved: [...new Set([...unresolved, ...verify.unknown])],
        maskedDraft: gen.maskedDraft,
      });
      setEditorOpen(false);
      setEditedText(null);
      setStep("done");
    } catch (e) {
      setStep("input");
      setError(
        e instanceof Error
          ? e.message
          : "生成に失敗しました。もう一度お試しください。",
      );
    }
  }, [defs, docType, extraMasks, note, profile, step, values]);

  const onPrimarySubmit = () => {
    if (quotaExhausted) return;
    const missing = computeMissing(defs, values);
    if (missing.length > 0) {
      const next: Record<string, string> = {};
      for (const m of missing) next[m.key] = "必須項目です。";
      setErrors(next);
      const el = document.getElementById(`f-${missing[0].key}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus?.({ preventScroll: true });
      return;
    }
    // フォーム値のみの送信は確定的にマスクされるため確認画面を出さない。
    // 自由記述（AIへの追加指示）を含む場合のみ送信前確認を挟む。
    if (note.trim()) {
      setStep("confirm");
      return;
    }
    void run();
  };

  /** アップロード取込 → 修正エディタへ引き継ぐ（アップロード由来として扱う） */
  const onUpload = (text: string, fileName: string) => {
    writeUploadHandoff({ text, fileName });
    router.push("/edit");
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="no-print flex items-center justify-between gap-4">
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

      {step === "type" && (
        <>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            書類の種類を選ぶ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            作成する書類の種類を選んでください。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => chooseDocType(t)}
                className="rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <FileText aria-hidden className="size-5 text-primary" />
                <p className="mt-2 text-sm font-bold">{DOC_TYPE_LABELS[t]}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {DOC_TYPE_DESCRIPTIONS[t]}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "method" && docType && (
        <>
          <button
            type="button"
            onClick={() => setStep("type")}
            className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" /> 種類の選択に戻る
          </button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            作成方法を選ぶ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {DOC_TYPE_LABELS[docType]}をどの方法で用意するか選んでください。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep("input")}
              className="rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <ListChecks aria-hidden className="size-5 text-primary" />
              <p className="mt-2 text-sm font-bold">フォームに入力して作る</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                項目に沿って入力すると、AIがドラフトを作成します。社名・氏名などは送信前に端末内でマスクされます。
              </p>
            </button>
            <div className="rounded-xl border border-border bg-card p-5">
              <FileUp aria-hidden className="size-5 text-primary" />
              <p className="mt-2 text-sm font-bold">既存の書類から作る</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                お手元の書類（.txt / .docx）を取り込んで、編集画面で整えます。取込はこの端末内で完結します。
              </p>
              <div className="mt-3">
                <DocumentImporter onImport={onUpload} />
              </div>
            </div>
          </div>
        </>
      )}

      {step === "input" && docType && (
        <>
          <button
            type="button"
            onClick={() => setStep("method")}
            className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" /> 作成方法の選択に戻る
          </button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {DOC_TYPE_LABELS[docType]}を作成
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            内容を入力してください。
          </p>

          <section className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
            <GuidedFields
              defs={defs}
              values={values}
              errors={errors}
              onChange={onFieldChange}
            />
            <Field
              label="AIへの追加指示（任意）"
              htmlFor="f-note"
              className="mt-4"
              hint="ここに書いた文章は、そのままAIへの指示として送られます。個別の法的助言ではありません。入力済みの社名・氏名などが含まれる場合は送信前に端末内でマスクされ、送信前の確認画面で内容を確かめられます。"
            >
              <Textarea
                id="f-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="「契約期間を6ヶ月に変更してください」「支払サイトを翌月末払いにしてください」"
              />
            </Field>

            {quotaExhausted && (
              <div className="mt-5 rounded-md border border-warning/40 bg-amber-50 px-4 py-4">
                <p className="text-sm text-amber-900">
                  今月の無料枠（AI生成 {usage.limit}回）を使い切りました。続けるには有料プランをご検討ください。
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="rounded-md border border-border bg-card px-4 py-2">
                    <p className="text-xs text-muted-foreground">月払い</p>
                    <p className="text-sm font-medium">月額 780円</p>
                  </div>
                  <div className="relative rounded-md border-2 border-accent-amber bg-accent px-4 py-2">
                    <span className="absolute -top-2 left-3 rounded bg-accent-amber px-1.5 py-0.5 text-[10px] font-medium text-accent-amber-foreground">
                      おすすめ
                    </span>
                    <p className="text-xs text-accent-foreground">年払い</p>
                    <p className="text-sm font-medium text-accent-foreground">
                      年額 6,980円（実質 月580円）
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => toast("お申し込みは近日提供予定です")}
                  >
                    プランを見る
                  </Button>
                  {!presentMode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        getBillingService().reset();
                        setUsage(getBillingService().getUsage());
                      }}
                    >
                      <RotateCcw aria-hidden /> リセット（開発用）
                    </Button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <ErrorState
                className="mt-5"
                title="生成できませんでした"
                description={error}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void run()}
                  >
                    再試行
                  </Button>
                }
              />
            )}

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button
                id="btn-generate"
                size="lg"
                disabled={quotaExhausted}
                onClick={onPrimarySubmit}
              >
                マスクして作成
              </Button>
            </div>
          </section>
        </>
      )}

      {step === "confirm" && docType && (
        <MaskConfirm
          description="自由記述（AIへの追加指示）を含むため、送信前に確認してください。入力済みの社名・氏名などは下記のとおりマスクされます。"
          masked={notePreview.masked}
          entries={notePreview.entries}
          extraMasks={extraMasks}
          onAddMask={(v) => setExtraMasks((p) => [...p, v])}
          onRemoveMask={(value) =>
            setExtraMasks((p) => p.filter((m) => m.value !== value))
          }
          onBack={() => setStep("input")}
          onSubmit={() => void run()}
        />
      )}

      {step === "working" && (
        <section className="mt-5 flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-14">
          <Stepper steps={STEPS} activeIndex={stage} />
          <p className="text-sm text-muted-foreground">
            {stage === 0 && "端末内でマスクしています…"}
            {stage === 1 && "マスク済みテキストからドラフトを生成しています…"}
            {stage === 2 && "端末内で元の情報に復元しています…"}
          </p>
        </section>
      )}

      {step === "done" && result && (
        <section id="result-doc" className="mt-6 space-y-4">
          {result.unresolved.length > 0 && (
            <div className="no-print rounded-md border border-warning/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              復元できない箇所があります: {result.unresolved.join("、")}
              （AIがプレースホルダを改変した可能性があります）
            </div>
          )}

          <DocumentCard
            title={result.title}
            maskedCount={result.entries.length}
            actions={
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                {presentMode ? (
                  <span />
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    モック生成 — Phase HでClaude APIに接続
                  </span>
                )}
                <OutputActions
                  onEdit={() => {
                    setEditedText((prev) =>
                      prev == null ? result.restored : prev,
                    );
                    setEditorOpen(true);
                  }}
                  onBackToForm={backToForm}
                  onPdf={() => window.print()}
                  onCopy={async () => {
                    await navigator.clipboard.writeText(displayedText);
                    toast("クリップボードにコピーしました", "success");
                  }}
                />
              </div>
            }
            footer={
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none">
                  マスクした項目（{result.entries.length}件）— 対応表は端末内のみ
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {result.entries.map((e) => (
                    <li key={e.placeholder} className="flex items-center gap-2">
                      <span className="rounded bg-eclipse px-1.5 py-0.5 text-[11px] font-medium text-eclipse-foreground">
                        {e.placeholder}
                      </span>
                      <span aria-hidden>→</span>
                      <span className="text-foreground">{e.original}</span>
                    </li>
                  ))}
                </ul>
              </details>
            }
          >
            <div className="no-print whitespace-pre-wrap">{displayedText}</div>
            <div className="print-target hidden whitespace-pre-wrap print:block">
              {displayedText}
            </div>
          </DocumentCard>

          <div className="no-print">
            <Button variant="ghost" size="sm" onClick={resetAll}>
              <FilePlus2 aria-hidden /> 新しく作成する
            </Button>
          </div>
        </section>
      )}

      <EditorDrawer
        open={editorOpen}
        title="契約書を編集"
        onClose={() => setEditorOpen(false)}
      >
        <ContractEditor
          value={displayedText}
          onChange={(v) => setEditedText(v)}
          onPdf={() => window.print()}
        />
      </EditorDrawer>
    </main>
  );
}

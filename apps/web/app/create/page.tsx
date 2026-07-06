"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, History, Moon, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { DocumentCard } from "@/components/document-card";
import { Field } from "@/components/field";
import { Highlighter } from "@/components/highlighter";
import { OutputActions } from "@/components/output-actions";
import { Stepper } from "@/components/stepper";
import { UsageMeter } from "@/components/usage-meter";
import { ErrorState } from "@/components/status";
import { GuidedFields } from "@/components/create/guided-fields";
import { DOC_FORMS } from "@/lib/doc-forms";
import { withTimeout } from "@/lib/async";
import {
  buildMaskPreview,
  computeMissing,
  resolveDisplayedText,
} from "@/lib/create-logic";
import { detectPII, resolveOverlaps } from "@/lib/services/detection";
import {
  getBillingService,
  getGenerationService,
  getHistoryService,
  getNerService,
  getProfileService,
} from "@/lib/services/factory";
import type { GenerateInput } from "@/lib/services/generation";
import {
  MaskRegistry,
  maskText,
  maskWholeValue,
  restoreText,
  verifyDraft,
  type MaskEntry,
} from "@/lib/services/mask";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/services/types";

const STEPS = ["マスク", "AI生成", "復元"];
const DOC_TYPE_STORAGE_KEY = "eclipse.docType";
const GENERATE_TIMEOUT_MS = 30000;

const DOC_TYPE_OPTIONS = (
  Object.entries(DOC_TYPE_LABELS) as [DocType, string][]
).map(([value, label]) => ({ value, label }));

const MODE_OPTIONS: { value: "create" | "edit"; label: string }[] = [
  { value: "create", label: "新規作成" },
  { value: "edit", label: "文書を修正" },
];

type Phase = "input" | "confirm" | "working" | "done";

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
  const [docType, setDocType] = useState<DocType>("gyomu_itaku");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ResultState | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState(() => getBillingService().getUsage());
  // 配布版はテスター向けに既定で開発マーカー非表示。開発時は ?present=0 で表示。
  const [presentMode, setPresentMode] = useState(true);
  const [cameFromResult, setCameFromResult] = useState(false);
  const registryRef = useRef<MaskRegistry | null>(null);
  const forceFailRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(DOC_TYPE_STORAGE_KEY);
    if (saved === "gyomu_itaku" || saved === "nda" || saved === "hatchu") {
      setDocType(saved);
    }
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
  }, []);

  // フォームに戻って再生成で戻ってきた時のみ、追加指示欄へフォーカス。
  useEffect(() => {
    if (phase === "input" && cameFromResult) {
      document.getElementById("f-note")?.focus();
      setCameFromResult(false);
    }
  }, [phase, cameFromResult]);

  const defs = DOC_FORMS[docType];
  const noteSpans = useMemo(() => detectPII(note), [note]);
  const notePreview = useMemo(() => buildMaskPreview(note), [note]);
  const quotaExhausted = usage.used >= usage.limit;
  const displayedText = result
    ? resolveDisplayedText(editedText, result.restored)
    : "";

  const changeDocType = (t: DocType) => {
    setDocType(t);
    setErrors({});
    window.localStorage.setItem(DOC_TYPE_STORAGE_KEY, t);
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
    setPhase("input");
    setResult(null);
    setError(null);
    setErrors({});
    setEditing(false);
    setEditedText(null);
    registryRef.current = null;
  }, []);

  const backToForm = useCallback(() => {
    setPhase("input");
    setEditing(false);
    setEditedText(null);
    setError(null);
    setCameFromResult(true); // 追加指示欄にフォーカス
  }, []);

  /** 自由記述のマスク（端末内regex＋必要ならNER） */
  const maskFree = useCallback(
    async (text: string, reg: MaskRegistry, withNer: boolean) => {
      const regexSpans = detectPII(text);
      const nerSpans = withNer ? await getNerService().analyze(text) : [];
      return maskText(text, resolveOverlaps([...regexSpans, ...nerSpans]), reg);
    },
    [],
  );

  const run = useCallback(async () => {
    if (phase === "working") return;
    const billing = getBillingService();
    if (!billing.canConsume()) {
      setUsage(billing.getUsage());
      setPhase("input");
      return;
    }
    setError(null);
    setPhase("working");
    setStage(0);
    try {
      const reg = new MaskRegistry();
      const title = DOC_TYPE_LABELS[docType];
      const profile = getProfileService().get();
      const fields: Record<string, string> = {
        self: maskWholeValue(profile.name, "PERSON", reg),
        selfShop: maskWholeValue(profile.shopName, "ORG", reg),
      };
      for (const def of defs) {
        const raw = (values[def.key] ?? "").trim();
        if (!raw) continue;
        fields[def.key] = def.entity
          ? maskWholeValue(raw, def.entity, reg)
          : maskText(raw, detectPII(raw), reg);
      }
      const maskedNote = note.trim()
        ? await maskFree(note, reg, true)
        : undefined;
      const input: GenerateInput = {
        docType,
        mode: "create",
        fields,
        maskedNote,
      };
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
      const verify = verifyDraft(gen.maskedDraft, reg.list());
      const { text: restored, unresolved } = restoreText(
        gen.maskedDraft,
        reg.list(),
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
      registryRef.current = reg;
      setResult({
        title,
        restored,
        entries: reg.list(),
        unresolved: [...new Set([...unresolved, ...verify.unknown])],
        maskedDraft: gen.maskedDraft,
      });
      setEditing(false);
      setEditedText(null);
      setPhase("done");
    } catch (e) {
      setPhase("input");
      setError(
        e instanceof Error
          ? e.message
          : "生成に失敗しました。もう一度お試しください。",
      );
    }
  }, [defs, docType, maskFree, note, phase, values]);

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
    // 追加指示欄に入力がある時だけ送信前確認を挟む
    if (note.trim()) {
      setPhase("confirm");
      return;
    }
    void run();
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="no-print flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-bold tracking-tight"
        >
          <Moon aria-hidden className="size-5 text-primary" />
          Eclipse
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

      {phase !== "done" && (
        <>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            契約書を作成
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            文書タイプを選んで、内容を入力してください。
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={"create" as "create" | "edit"}
              onChange={(m) => {
                if (m === "edit") router.push("/edit");
              }}
              options={MODE_OPTIONS}
            />
            <SegmentedControl
              value={docType}
              onChange={changeDocType}
              options={DOC_TYPE_OPTIONS}
            />
          </div>
        </>
      )}

      {phase === "input" && (
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
            hint="AIに追加で反映してほしい条件を、箇条書きや短い文で指示できます（例：条項の追加・期間や金額の調整）。これは生成ドラフトのための指示であり、個別の法的助言ではありません。含まれる個人情報は送信前に端末内で自動マスクされます。"
          >
            <Textarea
              id="f-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：契約期間は6ヶ月に。検収は納品後5営業日以内に。請求書は田中彩様宛てに。"
            />
          </Field>
          {note.trim() && noteSpans.length > 0 && (
            <div className="mt-3 rounded-md bg-muted/60 p-3">
              <p className="mb-1 text-xs text-muted-foreground">
                端末内検出（{noteSpans.length}件）— マスク対象
              </p>
              <Highlighter
                text={note}
                spans={noteSpans}
                className="text-[13px]"
              />
            </div>
          )}

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
                <div className="relative rounded-md border-2 border-primary bg-accent px-4 py-2">
                  <span className="absolute -top-2 left-3 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
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
                <Button size="sm" variant="outline" onClick={() => void run()}>
                  再試行
                </Button>
              }
            />
          )}

          <div className="mt-5 flex justify-end border-t border-border pt-4">
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
      )}

      {phase === "confirm" && (
        <section className="mt-5 space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight">送信内容の確認</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              追加指示は自動検出でマスクします。下記の内容でAIに送信します（人名・社名の高精度検出（NER）は送信時に適用されます）。
            </p>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <p className="mb-1 text-xs text-muted-foreground">
              追加指示・マスク後のプレビュー
            </p>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {notePreview.masked}
            </p>
          </div>
          {notePreview.entries.length > 0 ? (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                マスクする項目（{notePreview.entries.length}件）
              </p>
              <ul className="space-y-1.5">
                {notePreview.entries.map((e) => (
                  <li
                    key={e.placeholder}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="rounded bg-eclipse px-1.5 py-0.5 text-[11px] font-medium text-eclipse-foreground">
                      {e.placeholder}
                    </span>
                    <span aria-hidden>→</span>
                    <span className="text-foreground">{e.original}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              追加指示にマスク対象は検出されませんでした。
            </p>
          )}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setPhase("input")}>
              戻る
            </Button>
            <Button onClick={() => void run()}>この内容でマスクして送信</Button>
          </div>
        </section>
      )}

      {phase === "working" && (
        <section className="mt-5 flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-14">
          <Stepper steps={STEPS} activeIndex={stage} />
          <p className="text-sm text-muted-foreground">
            {stage === 0 && "端末内でマスクしています…"}
            {stage === 1 && "マスク済みテキストからドラフトを生成しています…"}
            {stage === 2 && "端末内で元の情報に復元しています…"}
          </p>
        </section>
      )}

      {phase === "done" && result && (
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
            footer={
              <div className="space-y-3">
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {presentMode ? (
                    <span />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      モック生成 — Phase HでClaude APIに接続
                    </span>
                  )}
                  <OutputActions
                    editing={editing}
                    onEdit={() => {
                      setEditedText((prev) =>
                        prev == null ? result.restored : prev,
                      );
                      setEditing((v) => !v);
                    }}
                    onBackToForm={backToForm}
                    onPdf={() => window.print()}
                    onCopy={async () => {
                      await navigator.clipboard.writeText(displayedText);
                      toast("クリップボードにコピーしました", "success");
                    }}
                  />
                </div>
              </div>
            }
          >
            <div className="no-print">
              {editing ? (
                <Textarea
                  aria-label="生成された文書"
                  value={displayedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[28rem] font-serif text-[15px] leading-8"
                />
              ) : (
                <div className="whitespace-pre-wrap">{displayedText}</div>
              )}
            </div>
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
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FilePlus2, Moon, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { detectPII, resolveOverlaps } from "@/lib/services/detection";
import {
  getBillingService,
  getGenerationService,
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

const DOC_TYPE_OPTIONS = (
  Object.entries(DOC_TYPE_LABELS) as [DocType, string][]
).map(([value, label]) => ({ value, label }));

type Mode = "create" | "edit";
type Phase = "input" | "working" | "done";

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
  const [mode, setMode] = useState<Mode>("create");
  const [docType, setDocType] = useState<DocType>("gyomu_itaku");
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [editSource, setEditSource] = useState("");
  const [instruction, setInstruction] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState(() => getBillingService().getUsage());
  // 配布版はテスター向けに既定で開発マーカー非表示。開発時は ?present=0 で表示。
  const [presentMode, setPresentMode] = useState(true);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseText, setReviseText] = useState("");
  const registryRef = useRef<MaskRegistry | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(DOC_TYPE_STORAGE_KEY);
    if (saved === "gyomu_itaku" || saved === "nda" || saved === "hatchu") {
      setDocType(saved);
    }
    // テスト用モード: ?present=1 で開発マーカー非表示、?used=N でクォータ事前設定
    const params = new URLSearchParams(window.location.search);
    if (params.get("present") === "0") setPresentMode(false);
    else if (params.get("present") === "1") setPresentMode(true);
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

  const changeDocType = (t: DocType) => {
    setDocType(t);
    window.localStorage.setItem(DOC_TYPE_STORAGE_KEY, t);
  };

  const defs = DOC_FORMS[docType];
  const noteSpans = useMemo(() => detectPII(note), [note]);
  const sourceSpans = useMemo(() => detectPII(editSource), [editSource]);

  const missingRequired = useMemo(
    () =>
      defs
        .filter((d) => d.required && !(values[d.key] ?? "").trim())
        .map((d) => d.label),
    [defs, values],
  );
  const canRun =
    mode === "create"
      ? missingRequired.length === 0
      : editSource.trim().length > 0 && instruction.trim().length > 0;
  const quotaExhausted = usage.used >= usage.limit;

  /** 自由記述のマスク（端末内regex＋必要ならNER） */
  const maskFree = useCallback(
    async (text: string, reg: MaskRegistry, withNer: boolean) => {
      const regexSpans = detectPII(text);
      const nerSpans = withNer ? await getNerService().analyze(text) : [];
      return maskText(text, resolveOverlaps([...regexSpans, ...nerSpans]), reg);
    },
    [],
  );

  const resetAll = useCallback(() => {
    setPhase("input");
    setResult(null);
    setError(null);
    setReviseOpen(false);
    setReviseText("");
    registryRef.current = null;
  }, []);

  const run = useCallback(
    async (reviseInstruction?: string) => {
      const billing = getBillingService();
      const consumed = billing.consume();
      setUsage(consumed.usage);
      if (!consumed.ok) return;

      setError(null);
      setPhase("working");
      setStage(0);
      try {
        const isRevise =
          reviseInstruction != null &&
          registryRef.current != null &&
          result != null;
        const reg = isRevise ? registryRef.current! : new MaskRegistry();
        const title = mode === "edit" ? "修正版ドラフト" : DOC_TYPE_LABELS[docType];

        let input: GenerateInput;
        if (isRevise) {
          const maskedInstruction = await maskFree(reviseInstruction, reg, true);
          input = {
            docType,
            mode: "edit",
            fields: {},
            maskedSource: result.maskedDraft,
            maskedInstruction,
          };
        } else if (mode === "create") {
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
          input = { docType, mode: "create", fields, maskedNote };
        } else {
          const maskedSource = await maskFree(editSource, reg, true);
          const maskedInstruction = await maskFree(instruction, reg, true);
          input = {
            docType,
            mode: "edit",
            fields: {},
            maskedSource,
            maskedInstruction,
          };
        }
        await sleep(500);

        setStage(1);
        const gen = await getGenerationService().generate(input);

        setStage(2);
        const verify = verifyDraft(gen.maskedDraft, reg.list());
        const { text: restored, unresolved } = restoreText(
          gen.maskedDraft,
          reg.list(),
        );
        await sleep(450);

        registryRef.current = reg;
        setResult({
          title,
          restored,
          entries: reg.list(),
          unresolved: [...new Set([...unresolved, ...verify.unknown])],
          maskedDraft: gen.maskedDraft,
        });
        setPhase("done");
        setReviseOpen(false);
        setReviseText("");
      } catch (e) {
        setPhase("input");
        setError(
          e instanceof Error
            ? e.message
            : "生成に失敗しました。もう一度お試しください。",
        );
      }
    },
    [defs, docType, editSource, instruction, maskFree, mode, note, result, values],
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-bold tracking-tight"
        >
          <Moon aria-hidden className="size-5 text-primary" />
          Eclipse
        </Link>
        <div className="w-44">
          <UsageMeter used={usage.used} limit={usage.limit} />
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        {mode === "create" ? "契約書を作成" : "文書を修正"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "create"
          ? "文書タイプを選んで、内容を入力してください。"
          : "既存の文書を貼り付けて、修正指示を入力してください。"}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={mode}
          onChange={(m) => {
            setMode(m);
            resetAll();
          }}
          options={[
            { value: "create", label: "新規作成" },
            { value: "edit", label: "文書を修正" },
          ]}
        />
        {mode === "create" && (
          <SegmentedControl
            value={docType}
            onChange={changeDocType}
            options={DOC_TYPE_OPTIONS}
          />
        )}
      </div>

      {phase === "input" && (
        <section className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          {mode === "create" ? (
            <>
              <GuidedFields
                defs={defs}
                values={values}
                onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
              />
              <Field
                label="補足・特記（任意）"
                htmlFor="f-note"
                className="mt-4"
                hint="含まれる個人情報は端末内で自動マスクされます。"
              >
                <Textarea
                  id="f-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例：検収は納品後5営業日以内。請求書は田中彩様宛て。"
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
            </>
          ) : (
            <>
              <Field
                label="修正する文書"
                htmlFor="f-source"
                hint="テキストの貼り付けに対応。.docx取込は後続フェーズで追加予定。"
              >
                <Textarea
                  id="f-source"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="min-h-48 font-serif"
                  placeholder="ここに既存の契約書・文書を貼り付け"
                />
              </Field>
              {editSource.trim() && sourceSpans.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  端末内検出: {sourceSpans.length}件
                </p>
              )}
              <Field label="修正指示" htmlFor="f-instruction" className="mt-4">
                <Textarea
                  id="f-instruction"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="例：契約期間を6ヶ月に延長し、中途解約条項を追加してください。"
                />
              </Field>
            </>
          )}

          {quotaExhausted && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                本日の無料枠（AI生成 {usage.limit}回）を使い切りました。
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast("有料プランは近日提供予定です")}
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
              title="生成に失敗しました"
              description={error}
              action={
                <Button size="sm" variant="outline" onClick={() => run()}>
                  再試行
                </Button>
              }
            />
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {canRun || quotaExhausted
                ? ""
                : mode === "create"
                  ? `必須: ${missingRequired.join("・")}`
                  : "文書と修正指示を入力してください"}
            </p>
            <Button
              id="btn-generate"
              size="lg"
              disabled={!canRun || quotaExhausted}
              onClick={() => run()}
            >
              {mode === "create" ? "マスクして作成" : "マスクして修正"}
            </Button>
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
        <section id="result-doc" className="mt-5 space-y-4">
          {result.unresolved.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
                    <Badge variant="outline">
                      モック生成 — Phase HでClaude APIに接続
                    </Badge>
                  )}
                  <OutputActions
                    onCopy={async () => {
                      await navigator.clipboard.writeText(result.restored);
                      toast("クリップボードにコピーしました", "success");
                    }}
                    onDownload={() => toast("ダウンロードは近日提供予定です")}
                    onRevise={() => setReviseOpen((v) => !v)}
                  />
                </div>
                {reviseOpen && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <Field label="修正指示" htmlFor="f-revise">
                      <Textarea
                        id="f-revise"
                        value={reviseText}
                        onChange={(e) => setReviseText(e.target.value)}
                        placeholder="例：損害賠償の上限条項を削除してください。"
                      />
                    </Field>
                    <div className="flex items-center justify-end gap-3">
                      {quotaExhausted && (
                        <span className="text-xs text-amber-900">
                          無料枠を使い切りました
                        </span>
                      )}
                      <Button
                        size="sm"
                        disabled={!reviseText.trim() || quotaExhausted}
                        onClick={() => run(reviseText)}
                      >
                        再生成（1回消費）
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            }
          >
            <div className="whitespace-pre-wrap">{result.restored}</div>
          </DocumentCard>

          <div>
            <Button variant="ghost" size="sm" onClick={resetAll}>
              <FilePlus2 aria-hidden /> 新しく作成する
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

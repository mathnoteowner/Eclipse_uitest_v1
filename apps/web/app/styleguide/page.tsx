"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { Field } from "@/components/field";
import { MaskChip } from "@/components/mask-chip";
import { Highlighter } from "@/components/highlighter";
import { Stepper } from "@/components/stepper";
import { DocumentCard } from "@/components/document-card";
import { OutputActions } from "@/components/output-actions";
import { UsageMeter } from "@/components/usage-meter";
import { EmptyState, ErrorState, LoadingState } from "@/components/status";
import {
  DOC_TYPE_LABELS,
  ENTITY_META,
  type DocType,
  type EntityMeta,
  type EntitySource,
  type EntityType,
  type Span,
} from "@/lib/services/types";

const STEPS = ["マスク", "AI生成", "復元"];

const SAMPLE_TEXT =
  "株式会社スターワークスの田中彩様（tanaka@example.com / 090-1234-5678）と業務委託契約を締結します。報酬は月額50万円、契約期間は2026年7月1日から3ヶ月、勤務地は東京都渋谷区神南1-2-3です。";

function spanOf(
  text: string,
  needle: string,
  type: EntityType,
  source: EntitySource,
): Span {
  const start = text.indexOf(needle);
  return { start, end: start + needle.length, type, confidence: 0.98, source };
}

const SAMPLE_SPANS: Span[] = [
  spanOf(SAMPLE_TEXT, "株式会社スターワークス", "ORG", "ner"),
  spanOf(SAMPLE_TEXT, "田中彩", "PERSON", "ner"),
  spanOf(SAMPLE_TEXT, "tanaka@example.com", "EMAIL", "regex"),
  spanOf(SAMPLE_TEXT, "090-1234-5678", "PHONE", "regex"),
  spanOf(SAMPLE_TEXT, "月額50万円", "MONEY", "regex"),
  spanOf(SAMPLE_TEXT, "2026年7月1日", "DATE", "regex"),
  spanOf(SAMPLE_TEXT, "東京都渋谷区神南1-2-3", "ADDRESS", "regex"),
].filter((s) => s.start >= 0);

const TOKEN_SWATCHES: { name: string; className: string; note: string }[] = [
  { name: "background", className: "bg-background", note: "ページ背景" },
  { name: "card", className: "bg-card", note: "カード・面" },
  { name: "muted", className: "bg-muted", note: "控えめな面" },
  { name: "border", className: "bg-border", note: "罫線" },
  { name: "primary", className: "bg-primary", note: "主ボタン・強調" },
  { name: "accent", className: "bg-accent", note: "選択・ハイライト面" },
  { name: "success", className: "bg-success", note: "成功" },
  { name: "warning", className: "bg-warning", note: "警告" },
  { name: "destructive", className: "bg-destructive", note: "エラー" },
  { name: "eclipse", className: "bg-eclipse", note: "マスク済み（蝕）" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        {children}
      </div>
    </section>
  );
}

export default function StyleguidePage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [docType, setDocType] = useState<DocType>("gyomu_itaku");
  const [step, setStep] = useState(1);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-3.5" /> トップへ戻る
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Eclipse UIカタログ
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Phase A（デザインシステム＆UI基盤）の成果物。トークンと共通部品の一覧。
          白基調＋ブランドブルー（#0095D9）を必要最小限に（参照: BCG / Thomson
          Reuters HighQ / VC4）。ダークモード対応は後フェーズ。
        </p>
      </header>

      <Section
        title="1. カラートークン"
        description="すべての部品はこのトークンだけを参照する（直接色指定は禁止）。"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {TOKEN_SWATCHES.map((s) => (
            <div key={s.name} className="space-y-1">
              <div
                className={`h-10 rounded-md border border-border ${s.className}`}
              />
              <p className="text-xs font-medium">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="2. タイポグラフィ"
        description="UIは Noto Sans JP、契約文書の本文は Noto Serif JP。"
      >
        <div className="space-y-3">
          <p className="text-2xl font-bold">見出し 24px Bold — 契約書を作成</p>
          <p className="text-lg font-bold">見出し 18px Bold — セクション</p>
          <p className="text-sm">
            本文 14px — クライアント情報を渡さずに、AIで契約書を作る。
          </p>
          <p className="text-xs text-muted-foreground">
            補足 12px muted — あなたの個人情報はAIに渡りません
          </p>
          <div className="rounded-md bg-muted/50 p-4 font-serif text-[15px] leading-8">
            文書体（セリフ） —
            甲および乙は、本契約の履行にあたり知り得た相手方の秘密情報を、第三者に開示または漏洩してはならない。
          </div>
        </div>
      </Section>

      <Section title="3. Button" description="variant × size。主要CTAは default。">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button>安全に作成する</Button>
            <Button variant="secondary">コピー</Button>
            <Button variant="outline">修正を依頼</Button>
            <Button variant="ghost">キャンセル</Button>
            <Button variant="destructive">削除</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg">lg — 安全に作成する</Button>
            <Button size="sm" variant="secondary">
              sm — コピー
            </Button>
            <Button disabled>
              <Loader2 aria-hidden className="animate-spin" /> 生成中…
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="4. バッジ・チップ"
        description="MaskChip はマスク済みプレースホルダ（蝕モチーフ）を表す。保護を謳う文言チップは方針により使用しない。"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Free</Badge>
            <Badge variant="success">生成完了</Badge>
            <Badge variant="warning">残り1回</Badge>
            <Badge variant="destructive">上限到達</Badge>
            <Badge variant="outline">下書き</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MaskChip type="PERSON" index={1} />
            <MaskChip type="ORG" index={1} />
            <MaskChip type="MONEY" index={1} />
            <MaskChip type="DATE" index={2} />
            <MaskChip type="ADDRESS" index={1} />
          </div>
        </div>
      </Section>

      <Section
        title="5. SegmentedControl"
        description="モード切替と文書タイプ選択。前回値の記憶は Phase B で実装。"
      >
        <div className="space-y-4">
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: "create", label: "新規作成" },
              { value: "edit", label: "文書を修正" },
            ]}
          />
          <SegmentedControl
            size="lg"
            value={docType}
            onChange={setDocType}
            options={(
              Object.entries(DOC_TYPE_LABELS) as [DocType, string][]
            ).map(([value, label]) => ({ value, label }))}
          />
          <p className="text-xs text-muted-foreground">
            選択中: {mode === "create" ? "新規作成" : "文書を修正"} /{" "}
            {DOC_TYPE_LABELS[docType]}
          </p>
        </div>
      </Section>

      <Section
        title="6. Field ＋ 入力部品"
        description="ガイド項目の入力。何がマスクされたかは結果画面で事実として示す。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="クライアント名" htmlFor="sg-client">
            <Input id="sg-client" defaultValue="株式会社スターワークス" />
          </Field>
          <Field label="報酬" htmlFor="sg-fee">
            <Input id="sg-fee" defaultValue="月額50万円" />
          </Field>
          <Field
            label="業務内容"
            htmlFor="sg-scope"
            hint="固有名詞を含まない範囲で書くと、より安全です。"
          >
            <Input id="sg-scope" defaultValue="コーポレートサイトの制作" />
          </Field>
          <Field
            label="クライアント名"
            htmlFor="sg-error"
            error="必須項目です。"
          >
            <Input id="sg-error" placeholder="例：株式会社〇〇" />
          </Field>
          <Field
            label="補足・特記（自由記述）"
            htmlFor="sg-note"
            hint="ここに書いた個人情報も自動でマスクされます。"
            className="sm:col-span-2"
          >
            <Textarea
              id="sg-note"
              defaultValue="担当は田中彩様。初稿は2週間で提出予定。"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="7. Highlighter（検出ハイライト）"
        description="検出スパンは統一ブルーで強調（色は「保護対象」という意味にのみ使う）。種別と検出元はホバーで表示。"
      >
        <div className="space-y-4">
          <Highlighter text={SAMPLE_TEXT} spans={SAMPLE_SPANS} />
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {(Object.entries(ENTITY_META) as [EntityType, EntityMeta][]).map(
              ([type, meta]) => (
                <span
                  key={type}
                  className={`rounded-sm px-1.5 py-0.5 text-[11px] ${meta.className}`}
                >
                  {meta.label}
                </span>
              ),
            )}
          </div>
        </div>
      </Section>

      <Section
        title="8. Stepper（保護 → AI生成 → 復元）"
        description="主ボタン押下後の裏側処理を1行で可視化する。"
      >
        <div className="space-y-4">
          <Stepper steps={STEPS} activeIndex={0} />
          <Stepper steps={STEPS} activeIndex={1} />
          <Stepper steps={STEPS} activeIndex={3} />
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Stepper steps={STEPS} activeIndex={step} />
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
              >
                <Play aria-hidden /> 進める
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStep(0)}>
                <RotateCcw aria-hidden /> リセット
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="9. UsageMeter（利用量）"
        description="Freeプランの日次クォータ。80%で警告色、上限で赤。"
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <UsageMeter used={1} limit={3} />
          <UsageMeter used={4} limit={5} label="今月のNER解析" />
          <UsageMeter used={3} limit={3} />
        </div>
      </Section>

      <Section
        title="10. DocumentCard ＋ OutputActions"
        description="完成文書の表示。本文はセリフ体、操作はヘッダー直下（スクロール不要）、詳細情報はフッターに。"
      >
        <DocumentCard
          title={DOC_TYPE_LABELS[docType]}
          maskedCount={6}
          actions={
            <OutputActions
              onEdit={() => toast("端末内で直接編集できます")}
              onBackToForm={() => toast("フォームに戻って再生成します")}
              onPdf={() => toast("印刷→PDF保存を開きます")}
              onCopy={() =>
                toast("クリップボードにコピーしました", "success")
              }
            />
          }
          footer={
            <span className="text-xs text-muted-foreground">
              マスクした項目（6件）: 田中彩 → 〘氏名1〙 ほか
            </span>
          }
        >
          <p className="mb-3 text-center font-semibold">業務委託契約書</p>
          <p className="mb-2">
            株式会社スターワークス（以下「甲」という）と田中彩（以下「乙」という）とは、次のとおり業務委託契約を締結する。
          </p>
          <p className="mb-2">
            第1条（業務内容）　乙は甲に対し、コーポレートサイトの制作業務を行う。
          </p>
          <p>
            第2条（報酬）　甲は乙に対し、報酬として月額50万円を支払う。契約期間は2026年7月1日から3ヶ月間とする。
          </p>
        </DocumentCard>
      </Section>

      <Section
        title="11. 状態表示（Empty / Error / Loading / Skeleton）"
        description="エッジ状態の標準表現。文言はすべて日本語・具体的な次の行動を示す。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            title="まだ文書がありません"
            description="文書タイプを選んで内容を入力すると、ここに完成文書が表示されます。"
            action={<Button size="sm">契約書を作成</Button>}
          />
          <ErrorState
            title="生成に失敗しました"
            description="AIが応答しませんでした。内容は保持されています。もう一度お試しください。"
            action={
              <Button size="sm" variant="outline">
                再試行
              </Button>
            }
          />
          <LoadingState title="マスク済みテキストから生成中…" />
          <div className="space-y-2 rounded-xl border border-border p-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Section>

      <footer className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">
        Eclipse — Phase A: デザインシステム＆UI基盤 ／ 次: Phase
        B（インタラクティブ・プロトタイプ）
      </footer>
    </main>
  );
}

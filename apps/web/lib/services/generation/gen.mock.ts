import type {
  GenerateInput,
  GenerateResult,
  GenerationService,
} from "./index";

interface Clause {
  title: string;
  body: string;
}

function renderClauses(clauses: Clause[]): string {
  return clauses
    .map((c, i) => `第${i + 1}条（${c.title}）\n${c.body}`)
    .join("\n\n");
}

function gyomuItaku(
  f: Record<string, string>,
  note?: string,
  instruction?: string,
): string {
  const clauses: Clause[] = [
    {
      title: "目的",
      body: `甲は乙に対し、次の業務（以下「本件業務」という。）を委託し、乙はこれを受託する。\n一　${f.scope ?? "（業務内容）"}`,
    },
    {
      title: "納品物",
      body: `乙は、本件業務の成果物として${f.deliverable ?? "（納品物）"}（以下「本納品物」という。）を甲に納入する。`,
    },
    {
      title: "委託料",
      body: `1　本件業務の委託料は、${f.fee ?? "（報酬）"}（消費税別）とする。\n2　甲は、乙の発行する請求書に基づき、当月末日締め翌月末日払いにて、乙の指定する銀行口座に振り込む方法により支払う。振込手数料は甲の負担とする。`,
    },
    {
      title: "契約期間",
      body: `本契約の有効期間は、${f.period ?? "（契約期間）"}とする。期間満了の1か月前までに、甲乙いずれからも書面による別段の申出がないときは、本契約は同一条件で更新されるものとする。`,
    },
    ...(f.contact
      ? [
          {
            title: "連絡窓口",
            body: `本件業務に関する甲の連絡窓口は${f.contact}とし、乙の連絡窓口は${f.self ?? "乙"}とする。`,
          },
        ]
      : []),
    {
      title: "再委託",
      body: "乙は、甲の書面による事前の承諾がある場合を除き、本件業務の全部または一部を第三者に再委託してはならない。",
    },
    {
      title: "秘密保持",
      body: "甲および乙は、本契約の遂行により知り得た相手方の技術上または営業上の秘密情報を、相手方の書面による事前の承諾なく第三者に開示または漏えいしてはならない。本条の義務は、本契約終了後3年間存続する。",
    },
    {
      title: "知的財産権",
      body: "本納品物に関する著作権（著作権法第27条および第28条に定める権利を含む。）は、委託料の完済をもって乙から甲へ移転する。ただし、乙が従前から保有する著作物およびノウハウに関する権利は、乙に留保される。",
    },
    {
      title: "契約解除",
      body: "甲または乙は、相手方が本契約に違反し、相当の期間を定めて催告したにもかかわらず是正されないときは、本契約を解除することができる。",
    },
    {
      title: "損害賠償",
      body: "甲または乙は、本契約に違反して相手方に損害を与えたときは、直接かつ現実に生じた通常の損害に限り、これを賠償する。乙が負う賠償額は、本契約に基づき甲が支払った委託料の総額を上限とする。",
    },
    ...(note ? [{ title: "特記事項", body: note }] : []),
    ...(instruction
      ? [
          {
            title: "変更事項",
            body: `本契約は、次の指示に基づき更新された。\n${instruction}`,
          },
        ]
      : []),
    {
      title: "協議",
      body: "本契約に定めのない事項または本契約の解釈に疑義が生じた事項については、甲乙誠意をもって協議のうえ解決する。",
    },
  ];

  const head = `業務委託契約書\n\n${f.client ?? "（クライアント名）"}（以下「甲」という。）と${f.selfShop ?? "（屋号）"}（${f.self ?? "（氏名）"}。以下「乙」という。）とは、次のとおり業務委託契約（以下「本契約」という。）を締結する。`;
  const tail = `本契約の成立を証するため、本書2通を作成し、甲乙記名押印のうえ、各自1通を保有する。\n\n締結日：　　　　年　　月　　日\n\n甲：${f.client ?? ""}\n乙：${f.selfShop ?? ""}（${f.self ?? ""}）`;
  return `${head}\n\n${renderClauses(clauses)}\n\n${tail}`;
}

function nda(
  f: Record<string, string>,
  note?: string,
  instruction?: string,
): string {
  const clauses: Clause[] = [
    {
      title: "秘密情報",
      body: "本契約において「秘密情報」とは、本目的のために一方当事者が相手方に開示する技術上・営業上その他の一切の情報であって、開示の際に秘密である旨が明示されたもの、または性質上秘密と合理的に判断されるものをいう。",
    },
    {
      title: "秘密保持義務",
      body: "受領当事者は、秘密情報を善良な管理者の注意をもって管理し、開示当事者の書面による事前の承諾なく第三者に開示または漏えいしてはならない。",
    },
    {
      title: "目的外使用の禁止",
      body: "受領当事者は、秘密情報を本目的以外の目的に使用してはならない。",
    },
    {
      title: "複製の制限",
      body: "受領当事者は、本目的の達成に必要な範囲を超えて秘密情報を複製してはならない。複製物も秘密情報として本契約の適用を受ける。",
    },
    {
      title: "返還・破棄",
      body: "受領当事者は、開示当事者の求めがあったとき、または本契約が終了したときは、秘密情報およびその複製物を速やかに返還または破棄する。",
    },
    {
      title: "有効期間",
      body: `本契約の有効期間は、${f.period ?? "（秘密保持期間）"}とする。`,
    },
    {
      title: "損害賠償",
      body: "本契約に違反して相手方に損害を与えた当事者は、これにより相手方に生じた損害を賠償する。",
    },
    ...(note ? [{ title: "特記事項", body: note }] : []),
    ...(instruction
      ? [
          {
            title: "変更事項",
            body: `本契約は、次の指示に基づき更新された。\n${instruction}`,
          },
        ]
      : []),
    {
      title: "協議",
      body: "本契約に定めのない事項については、両当事者が誠意をもって協議のうえ解決する。",
    },
  ];

  const head = `秘密保持契約書\n\n${f.client ?? "（相手方）"}（以下「甲」という。）と${f.selfShop ?? "（屋号）"}（${f.self ?? "（氏名）"}。以下「乙」という。）とは、${f.purpose ?? "（開示目的）"}（以下「本目的」という。）のために相互に開示する秘密情報の取扱いについて、次のとおり合意する。`;
  const tail = `本契約の成立を証するため、本書2通を作成し、甲乙記名押印のうえ、各自1通を保有する。\n\n締結日：　　　　年　　月　　日\n\n甲：${f.client ?? ""}\n乙：${f.selfShop ?? ""}（${f.self ?? ""}）`;
  return `${head}\n\n${renderClauses(clauses)}\n\n${tail}`;
}

function hatchu(
  f: Record<string, string>,
  note?: string,
  instruction?: string,
): string {
  const lines = [
    "発注書",
    "",
    "発注日：　　　　年　　月　　日",
    "",
    `${f.client ?? "（発注先）"}　御中`,
    "",
    "下記のとおり発注いたします。",
    "",
    `件名：${f.item ?? "（件名）"}`,
    `内容・仕様：\n${f.detail ?? "（内容・仕様）"}`,
    `金額：${f.fee ?? "（金額）"}（消費税別）`,
    `納期：${f.due ?? "（納期）"}`,
    `支払条件：${f.payment ?? "納品月末締め翌月末払い"}`,
  ];
  if (note) lines.push("", `備考：\n${note}`);
  if (instruction) lines.push("", `変更事項：\n${instruction}`);
  lines.push("", `発注者：${f.selfShop ?? "（屋号）"}（${f.self ?? "（氏名）"}）`);
  return lines.join("\n");
}

function editRevision(source: string, instruction?: string): string {
  return `${source}\n\n———（修正案）———\n\n（変更覚書）\n1　本書は、次の指示に基づき上記文書を改訂するものである。\n　指示：${instruction ?? "（指示なし）"}\n2　上記指示と抵触する従前の条項は、指示の内容に読み替えて適用する。`;
}

/**
 * 生成モック。文書タイプ別テンプレートでドラフトを組み立てる。
 * ★プレースホルダ（〘…〙）は逐語で保持される（実LLMではここが最大リスク。
 *   Phase H で「逐語保持プロンプト＋生成後検証」とともに実装する）。
 */
export class MockGenerationService implements GenerationService {
  constructor(private delayMs = 1400) {}

  async generate(input: GenerateInput): Promise<GenerateResult> {
    await new Promise((r) => setTimeout(r, this.delayMs));
    let maskedDraft: string;
    if (input.mode === "edit") {
      maskedDraft = editRevision(
        input.maskedSource ?? "",
        input.maskedInstruction,
      );
    } else {
      switch (input.docType) {
        case "gyomu_itaku":
          maskedDraft = gyomuItaku(
            input.fields,
            input.maskedNote,
            input.maskedInstruction,
          );
          break;
        case "nda":
          maskedDraft = nda(
            input.fields,
            input.maskedNote,
            input.maskedInstruction,
          );
          break;
        case "hatchu":
          maskedDraft = hatchu(
            input.fields,
            input.maskedNote,
            input.maskedInstruction,
          );
          break;
      }
    }
    return { maskedDraft, model: "mock-template-v1" };
  }
}

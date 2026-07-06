import Link from "next/link";
import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <FileText aria-hidden className="size-7 text-primary" />
        AI書面くん
      </h1>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">
        契約書・NDA・発注書などの書面を作成・編集できます。入力した社名・氏名・金額は、送信前にお使いの端末の中でマスクされ、元の個人情報がAIに送られることはありません。
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/create" className={buttonVariants({ size: "lg" })}>
          契約書を作成する
        </Link>
        <Link
          href="/edit"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          文書を修正する
        </Link>
      </div>
    </main>
  );
}

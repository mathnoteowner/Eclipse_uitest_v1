import Link from "next/link";
import { Moon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <Moon aria-hidden className="size-7 text-primary" />
        Eclipse
      </h1>
      <p className="max-w-md text-base leading-7 text-foreground">
        クライアント情報を渡さずに、AIで契約書を作る。
      </p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        入力した社名・氏名・金額などは、お使いの端末内でマスクしてからAIへ。
        元の個人情報がAIに送られることはありません。
      </p>
      <Link href="/create" className={buttonVariants({ size: "lg" })}>
        契約書を作成する
      </Link>
    </main>
  );
}

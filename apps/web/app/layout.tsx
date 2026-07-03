import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Eclipse — クライアント情報を渡さずに、AIで契約書を作る",
  description:
    "入力した社名・氏名・金額・住所は端末内で自動マスク。マスク済みテキストだけをAIに送り、完成した契約書を安全に受け取れます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

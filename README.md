# Eclipse

フリーランス向け 契約書・文書 安全作成Webアプリ（開発リポジトリ）

> **Eclipse — 「クライアント情報を渡さずに、AIで契約書を作る。」**
> 入力した社名・氏名・金額・住所・日付は端末内で自動マスクされ、マスク済みテキストだけがAIに送られる。返ってきたドラフトは端末内で復元。個人情報は一切AIに渡らない。

## ドキュメント

企画・設計ドキュメントの正本は Google Drive 側にあります:
`G:\マイドライブ\プロダクト\Eclipse\Eclipse_app\docs\`

- `Eclipse 設計書 v2.1.md` … 主仕様（構想・詳細計画）
- `Eclipse UXUI設計・開発計画.md` … UX詳細・UIファースト方針・実装フェーズ（A–M）の最新

## 構成

```
apps/web/       Next.js フロントエンド（App Router / TypeScript / Tailwind v4）
services/ner/   FastAPI + GiNZA（Phase G で実装予定）
```

## 開発

```bash
cd apps/web
npm run dev   # http://localhost:3000
```

- `/styleguide` … デザインシステムの部品カタログ（Phase A 成果物）

# Eclipse プロトタイプの公開手順（UIテスト配布用）

このプロトタイプは**完全にブラウザ内で動く静的サイト**です（サーバー不要）。
`apps/web/out/`（またはリポジトリ直下の `eclipse-uitest-site.zip`）を任意の静的ホストに載せるだけで公開できます。

静的ビルドの生成/更新:
```bash
cd apps/web
npm run build      # → apps/web/out/ を生成
```
（リポジトリ直下の zip を作り直す場合は out/ の中身を圧縮）

テスターに配る最終リンクは **`<公開URL>/create/`** です（トップ `/` からも入れます）。

---

## 方法A：Netlify Drop（最速・CLI不要・おすすめ）
1. ブラウザで https://app.netlify.com/drop を開く
2. `apps/web/out` フォルダ（または `eclipse-uitest-site.zip`）を画面にドラッグ&ドロップ
3. 発行された `https://〇〇.netlify.app` を確認（サイトを保持するには GitHub 等でサインイン）
4. 必要なら管理画面でサブドメイン名を変更
5. テスターに **`https://〇〇.netlify.app/create/`** を配布

## 方法B：Vercel（本番の予定ホスト・再デプロイが楽）
```bash
cd apps/web
npm i -g vercel
vercel login          # ブラウザで認証
vercel --prod --yes   # Next.jsを自動検出し静的サイトをデプロイ
```
- 発行された `https://〇〇.vercel.app/create/` を配布
- コード変更後は `vercel --prod` を再実行するだけ

## 方法C：Cloudflare Pages（ダッシュボードでドラッグ）
1. Cloudflare ダッシュボード → Workers & Pages → Create → Pages → Upload assets
2. `apps/web/out` をアップロード → 発行URLを配布

---

## 更新（再デプロイ）
1. コード変更 → `cd apps/web && npm run build`
2. 方法A/C：新しい `out/` を再ドロップ／再アップロード
   方法B：`vercel --prod` を再実行

## メモ
- 既定でテスター向けに開発マーカー（「モック生成」等）は非表示です。開発時に表示したい場合は `…/create/?present=0`。
- Task 5（無料枠の上限）を確認させたい場合は `…/create/?used=3`。
- 現時点の生成はモック（テンプレート）です。文面の法的品質ではなく操作性・安心感の検証が目的です。

# the poster — ビルド計画（リード管理）

限定アートポスターEC「the poster」（画面表記: **THE POSTER**）をゼロから構築する。
仕様の正は本リポジトリの `docs/`（01〜10）+ ルート `CLAUDE.md` + `reference/poster-store-prototype.html`。
見た目・操作感の正は試作HTML。ロゴは公式SVGワードマーク `docs/assets/logo.svg`（→ `public/logo.svg`）。

## 不変条件（絶対に破らない・CLAUDE.mdより）
1. 在庫減算は Stripe webhook(`payment_intent.succeeded`)受信後、DB関数 `commit_order_stock()` のみ。
2. `insufficient_stock` 時は即返金(refund)し注文を `canceled`。
3. 秘密鍵(SERVICE_ROLE / STRIPE_SECRET / WEBHOOK_SECRET)はサーバー専用。`NEXT_PUBLIC_` を付けない。
4. orders/order_items 書き込みは service role のみ（ブラウザから作らない）。
5. RLS を無効化しない。公開読み取りは products の active/archived のみ。
6. 削除より状態遷移（archived）。物理削除は管理者の明示操作のみ。
7. 金額は cents(integer)。注文時の価格・タイトルは order_items にスナップショット。
8. 見た目は試作HTMLを正とする。勝手に装飾を足さない。
9. ロゴは公式SVG（THE POSTER ワードマーク）を使う。テキスト手書き・旧ひし形マーク禁止。

## スタック
Next.js(App Router,TS) + Tailwind / Supabase(Postgres/Auth/Storage) /
Stripe(Payment Element+Webhook) / React Three Fiber + drei。

## フェーズ分割

### Phase 1 — 土台（✅ 完了：commit 18ac9a9）
- Next.js scaffold / デザイントークン / lib骨格 / i18n辞書 / migration配置 / .env.local.example。
- ※旧名「Yohaku」で構築済み。名称・ロゴは Phase 1.5 で差し替える。

### Phase 1.5 — 名称・ロゴ差し替え（✅ 完了：commit 8c44c66）
- コード内の「Yohaku/yohaku」を「the poster / THE POSTER」へ差し替え（下記5箇所）：
  - `app/page.tsx`（ヘッダーのロゴ表記 → SVGワードマーク表示に変更）
  - `app/layout.tsx`（metadata title）
  - `package.json`（name: the-poster 等）
  - `supabase/migrations/0001_init.sql`（先頭コメント）
  - `supabase/seed.sql`（先頭コメント）
- `docs/assets/logo.svg` を `public/logo.svg` にコピーし、ヘッダーで表示（`docs/06` ロゴ仕様）。
- design-mate の Phase1 軽微指摘（1件）もこの機会に反映。
- リードが書き直した仕様書（README/CLAUDE.md/docs/01〜10/assets）も同じコミットに含める。
- `npm run build` 通過が完了基準。.tsx 変更ありのため design-mate を通す。

### Phase 2 — ストアページ `/`（✅ 完了：commit a0e1976）
- products(active/archived, sort_order順)をサーバーコンポーネントで取得。
- グリッド(PC4列/スマホ2列)、回る3Dポスター(R3F)、言語トグル、残量バー、在庫0=Archived。
- ※Supabase未接続のためサンプルでフォールバック描画。実フェッチ経路は実装済み。
- ユニットテスト(products-shared派生ロジック/i18n)実施。E2E/スモークはSupabase接続後に実施。

## 順序変更（keitakeuchi 判断 2026-06-15）
- 決済(Stripe)を後回しにし、先に **管理画面(Phase 4)** を実装する。
- 以降の順序: Phase 4（管理画面）→ Phase 3（チェックアウト）→ Phase 5（デプロイ）。
- 管理画面のUI/コードは Supabase 未接続でも実装・ビルド可能。ただし実ログイン・実CRUDの動作確認には Supabase 接続が必要（接続後に通しテスト）。

### Phase 3 — チェックアウト
- `/checkout`(2カラム)+Payment Element、`POST /api/create-payment-intent`、
- `POST /api/stripe/webhook`(署名検証→commit_order_stock→失敗時refund)、`/checkout/complete`。

### Phase 4 — 管理画面 `/admin/*`
- Supabase Auth ログイン+is_admin保護、商品CRUD、画像アップロード、公開/アーカイブ、注文/売上。

### Phase 5 — デプロイ
- Vercel + 独自ドメイン + 本番 Stripe webhook。公開前チェックリスト(`docs/10`)。

## keitakeuchi 側で必要な外部準備（Phase 2 以降の実データ・決済テストに必要）
- Supabase プロジェクト作成 + キー3種（URL / anon / service_role）。
- Stripe アカウント + テストキー（publishable / secret）+ webhook secret。
- ※ Phase 1・1.5（土台・名称）はこれら無しでもプレースホルダで構築・ビルド可能。

## 進め方ルール
- 1フェーズ完了ごとに dev-mate が集約報告 → リードが keitakeuchi に報告。
- 各フェーズの完了基準を満たすまで次に進まない。
- 設計判断・外部準備が必要になったら止めて keitakeuchi に確認。

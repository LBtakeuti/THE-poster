# Yohaku — ビルド計画（リード管理）

限定アートポスターEC「Yohaku」をゼロから構築する。仕様の正は
`yohaku-docs/yohaku-docs/`（docs/ 01〜10 + CLAUDE.md + reference のプロトタイプHTML）。
見た目・操作感の正は `yohaku-docs/yohaku-docs/reference/poster-store-prototype.html`。

## 不変条件（絶対に破らない・仕様CLAUDE.mdより）
1. 在庫減算は Stripe webhook(`payment_intent.succeeded`)受信後、DB関数 `commit_order_stock()` のみ。
2. `insufficient_stock` 時は即返金(refund)し注文を `canceled`。
3. 秘密鍵(SERVICE_ROLE / STRIPE_SECRET / WEBHOOK_SECRET)はサーバー専用。`NEXT_PUBLIC_` を付けない。
4. orders/order_items 書き込みは service role のみ（ブラウザから作らない）。
5. RLS を無効化しない。公開読み取りは products の active/archived のみ。
6. 削除より状態遷移（archived）。物理削除は管理者の明示操作のみ。
7. 金額は cents(integer)。注文時の価格・タイトルは order_items にスナップショット。
8. 見た目は試作HTMLを正とする。勝手に装飾を足さない。

## スタック
Next.js(App Router,TS) + Tailwind / Supabase(Postgres/Auth/Storage) /
Stripe(Payment Element+Webhook) / React Three Fiber + drei。

## フェーズ分割（このプランで段階的に進める）

### Phase 1 — 土台（★今ここ）
- Next.js scaffold（App Router / TS / Tailwind / ESLint）をプロジェクトルートに作成。
- `docs/06` のデザイントークンを Tailwind に落とす（ink/paper/hair/line/muted）。
- ディレクトリ方針（仕様CLAUDE.md）を作る。
- `supabase/migrations/0001_init.sql` を配置（ルートの 0001_init.sql を移設）。
- lib 一式の骨格：
  - `lib/supabase/{browser,server,service}.ts`（@supabase/ssr）
  - `lib/stripe.ts` / `lib/format.ts`（money()）
  - `lib/i18n/{dictionary.ts,context.tsx}`（`docs/09` の辞書をそのまま）
- `.env.local.example` を作成（`docs/10` の変数一覧。値は空でよい）。
- `npm run build` が通ること（プレースホルダenv前提でビルド成功）。
- UI実装(.tsx)を含むのでデザインチェックを通す。

### Phase 2 — ストアページ `/`
- products(active/archived, sort_order順)をサーバーコンポーネントで取得。
- グリッド(PC4列/スマホ2列)、回る3Dポスター(R3F)、言語トグル、残量バー、在庫0=Archived。
- 見た目・3D・操作感は試作HTMLを再現。

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
- ※ Phase 1（土台）はこれら無しでもプレースホルダで構築・ビルド可能。

## 進め方ルール
- 1フェーズ完了ごとに dev-mate が集約報告 → リードが keitakeuchi に報告。
- 各フェーズの完了基準を満たすまで次に進まない。
- 設計判断・外部準備が必要になったら止めて keitakeuchi に確認。

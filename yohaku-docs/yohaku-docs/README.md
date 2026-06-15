# Yohaku — 開発ドキュメント一式

限定アートポスターのオンラインストア「Yohaku」を作るための仕様書一式です。Claude Code に渡して開発を進めることを前提に書いています。

## これは何か

- 自作ポスターを売るミニマルな EC サイト。
- 管理画面から商品を追加・編集・アーカイブでき、各商品は「限定 N 枚」。在庫が 0 になると自動でアーカイブされ購入不可になる。
- フロントは真っ白な背景にロゴだけ。各ポスターは紙のように 360° 回る 3D UI で表示。PC は横 4 列、スマホは横 2 列。
- 日本語 / 英語の切り替えあり。
- 決済は Stripe（Payment Element）。

## スタック

- **Next.js (App Router, TypeScript)** — Vercel にデプロイ
- **Supabase** — Postgres / Auth / Storage
- **Stripe** — Payment Element + Webhook
- **React Three Fiber + drei** — 回る 3D ポスター
- ドメインは **お名前.com**（DNS を Vercel に向ける）

## 読む順番

1. `docs/01-overview.md` — 何を作るか・スコープ・用語
2. `docs/02-architecture.md` — 全体構成とデータの流れ
3. `docs/03-database-schema.md` — テーブル設計（**ここが核心**）
4. `docs/04-supabase-setup.md` — Supabase 側の設定（Storage / Auth / RLS）
5. `docs/05-stripe-integration.md` — 決済と在庫減算の流れ（**ここも核心**）
6. `docs/06-frontend-spec.md` — 画面・コンポーネント・3D・デザイントークン
7. `docs/07-admin-spec.md` — 管理画面
8. `docs/08-api-and-data-flow.md` — API ルートの契約
9. `docs/09-i18n.md` — 多言語の方針と辞書
10. `docs/10-env-and-deploy.md` — 環境変数・デプロイ・独自ドメイン

## フォルダ

```
yohaku-docs/
├─ README.md
├─ CLAUDE.md                      ← Claude Code 向けの作業指示・不変条件
├─ docs/                          ← 仕様書（上記の順で読む）
├─ supabase/
│  ├─ migrations/0001_init.sql    ← そのまま実行できる DB 定義
│  └─ seed.sql                    ← 任意の初期データ
└─ reference/
   └─ poster-store-prototype.html ← 動作するフロント試作（UI/3D の参照元）
```

`reference/poster-store-prototype.html` は実際に動く試作です。最終的な見た目・操作感・3D の質感・i18n 辞書は、これを正とみなして再現してください。

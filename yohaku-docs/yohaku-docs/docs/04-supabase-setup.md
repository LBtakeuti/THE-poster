# 04 — Supabase セットアップ

## 1. プロジェクト作成

1. supabase.com でプロジェクトを作る（リージョンは利用者に近い場所、例: Tokyo）。
2. Project Settings > API から以下を控える:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`（**サーバー専用・絶対に公開しない**）

## 2. スキーマ適用

`supabase/migrations/0001_init.sql` を SQL Editor に貼り付けて実行。
（CLI 派なら `supabase link` → `supabase db push`。）

## 3. 管理者ユーザー

1. Authentication > Users で自分のメールを追加（パスワード or マジックリンク）。
2. SQL Editor で:
   ```sql
   insert into public.admin_users (user_id)
   values ('<Authentication で作ったユーザーの UUID>');
   ```

## 4. Storage バケット `posters`

1. Storage > New bucket → 名前 `posters`、**Public bucket: ON**（読み取りは公開）。
2. 書き込みは管理者のみに制限。SQL Editor で Storage ポリシーを追加:

```sql
-- 公開読み取り（Public bucket なら select は自動だが明示しておく）
create policy "posters public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'posters');

-- 書き込み・更新・削除は管理者のみ
create policy "posters admin write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'posters' and public.is_admin());

create policy "posters admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'posters' and public.is_admin());

create policy "posters admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'posters' and public.is_admin());
```

## 5. 画像 URL の組み立て

`products.image_path`（例: `morning-sun/main.jpg`）から公開 URL を作る:

```ts
const { data } = supabase.storage.from('posters').getPublicUrl(product.image_path);
// data.publicUrl を R3F の useTexture や <img> に渡す
```

## 6. クライアントは 3 種類

| 用途 | キー | RLS | 置き場所 |
|---|---|---|---|
| ブラウザ | anon | 効く | `lib/supabase/browser.ts`（`@supabase/ssr` の createBrowserClient） |
| サーバー（ユーザー文脈） | anon + cookie | 効く | `lib/supabase/server.ts`（createServerClient） |
| サーバー（特権） | service_role | **バイパス** | `lib/supabase/service.ts`（webhook / 注文作成専用） |

service クライアントは webhook と `create-payment-intent` の注文作成でのみ使う。ページや管理画面の通常操作では使わない。

## 7. 認証方針

- 管理画面 `/admin/*` は Supabase Auth でログイン必須。
- ログイン後、サーバー側で `is_admin()`（= `admin_users` に居るか）を確認してから管理機能を許可。RLS でも守られるが、画面側でも弾く。

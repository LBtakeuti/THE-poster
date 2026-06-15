// サービスロール用 Supabase クライアント（service role key, RLS バイパス）。
// 【サーバー専用】絶対にクライアントへ出さない（不変条件 3）。
// orders / order_items の書き込みと在庫減算（webhook 経由）でのみ使用（不変条件 4）。
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

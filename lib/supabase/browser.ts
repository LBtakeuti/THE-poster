// ブラウザ用 Supabase クライアント（anon key + RLS）。
// 公開読み取りは products の active/archived のみ（不変条件 5）。
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// middleware からの Supabase セッション更新（@supabase/ssr 推奨パターン）。
// Cookie のリフレッシュを行い、サーバーコンポーネントで最新セッションを読めるようにする。
// ※ ここでは admin 判定はしない（ページ/レイアウト側で is_admin を確認する）。
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // env 未設定（ローカル・未接続）ではセッション処理をスキップして素通り。
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() を呼ぶとトークンがリフレッシュされる（getSession より安全）。
  await supabase.auth.getUser();

  return response;
}

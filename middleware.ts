// /admin/* のセッションを更新する（@supabase/ssr）。admin 判定は layout 側で行う。
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 管理画面のみ対象。静的アセット等は除外。
  matcher: ["/admin/:path*"],
};

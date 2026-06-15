// 管理画面の認証/権限ヘルパ（サーバー専用）。
// Supabase Auth でログイン必須 + is_admin() を満たすユーザーのみ許可（docs/07・04）。
// RLS でも守られるが、画面側でも弾く（多層防御）。
import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminContext = {
  userId: string;
  email: string | null;
};

/** ログイン済みかつ admin かを判定する（リダイレクトしない・判定のみ）。 */
export async function getAdminContext(): Promise<AdminContext | null> {
  // env 未設定（未接続）では admin 文脈なしとして扱う。
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // is_admin() を RPC で評価（admin_users に自分が居るか）。
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) return null;

  return { userId: user.id, email: user.email ?? null };
}

/**
 * admin を要求する。未ログイン/非 admin は /admin/login へリダイレクト。
 * 管理ページのサーバーコンポーネント先頭で呼ぶ。
 */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) {
    redirect("/admin/login");
  }
  return ctx;
}

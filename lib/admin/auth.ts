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
  // env 未設定（未接続）の扱い。
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    // 【開発専用バイパス】本番以外かつ Supabase 未接続のときだけ、
    // 管理画面を「テスト用」に開く（UI 確認のため）。データ取得は各 loader が
    // 未接続時に空を返すので、空状態の画面が見える。
    // ・本番（NODE_ENV=production）では効かない → null（=ログインへ）。
    // ・Supabase 接続後はこの分岐に入らず、本来の Auth + is_admin 判定に戻る。
    if (process.env.NODE_ENV !== "production") {
      return { userId: "test-admin", email: "test@local (テスト表示)" };
    }
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

"use server";

// 管理ログイン/ログアウトのサーバーアクション（メール+パスワード）。
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { error: "Supabase が未接続です。環境変数を設定してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "ログインに失敗しました。認証情報をご確認ください。" };
  }

  // ログイン後は管理トップ（商品一覧）へ。admin 判定は遷移先 layout で行う。
  revalidatePath("/admin", "layout");
  redirect("/admin/products");
}

export async function logoutAction(): Promise<void> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}

// 管理ログイン `/admin/login`。認証ゲートの外（誰でも到達可）。
// 既に admin ログイン済みなら商品一覧へ送る。
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/auth";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage() {
  const ctx = await getAdminContext();
  if (ctx) {
    redirect("/admin/products");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[360px] flex-col justify-center px-6">
      <Link href="/" aria-label="THE POSTER" className="mb-8 flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- 軽量な単色SVGワードマーク（docs/06） */}
        <img src="/logo.svg" alt="THE POSTER" className="h-[15px] w-auto" />
      </Link>
      <h1 className="mb-1 text-lg font-semibold tracking-[0.01em]">管理ログイン</h1>
      <p className="mb-6 text-[12px] text-muted">管理者アカウントでログインしてください。</p>
      <LoginForm />
    </main>
  );
}

// 認証ゲート + 管理画面の共通クローム（ナビ）。
// requireAdmin() で未ログイン/非adminは /admin/login へ。デザインはミニマル基調（docs/07）。
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAction } from "@/app/admin/login/actions";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-hair px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/admin/products" aria-label="THE POSTER admin" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- 軽量な単色SVGワードマーク（docs/06） */}
            <img src="/logo.svg" alt="THE POSTER" className="h-[14px] w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-[12px] tracking-[0.04em] text-muted">
            <Link href="/admin/products" className="transition-colors hover:text-ink">
              商品
            </Link>
            <Link href="/admin/orders" className="transition-colors hover:text-ink">
              注文
            </Link>
            <Link href="/admin/sales" className="transition-colors hover:text-ink">
              売上
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="hidden sm:inline">{ctx.email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="cursor-pointer rounded-full border border-hair px-3 py-[5px] tracking-[0.04em] transition-colors hover:border-ink hover:text-ink"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[980px] px-6 py-8">{children}</main>
    </div>
  );
}

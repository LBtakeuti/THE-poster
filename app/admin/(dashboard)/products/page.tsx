// 商品一覧 `/admin/products`。全 status を表示（docs/07）。
import Link from "next/link";
import { listAdminProducts } from "@/lib/admin/products";
import { posterPublicUrl } from "@/lib/products";
import { remaining } from "@/lib/products-shared";
import { money } from "@/lib/format";
import {
  archiveProductAction,
  unarchiveProductAction,
} from "./actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  active: "公開中",
  archived: "アーカイブ",
};

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-[0.01em]">商品</h1>
        <Link
          href="/admin/products/new"
          className="rounded-full border border-ink bg-ink px-4 py-2 text-[12px] font-medium tracking-[0.04em] text-white transition hover:-translate-y-px"
        >
          新規追加
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="rounded-[10px] border border-hair px-4 py-8 text-center text-[13px] text-muted">
          商品がありません。Supabase 接続後にデータが表示されます。「新規追加」から登録できます。
        </p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-hair">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hair text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-3 py-3 font-medium">作品</th>
                <th className="px-3 py-3 font-medium">価格</th>
                <th className="px-3 py-3 font-medium">在庫</th>
                <th className="px-3 py-3 font-medium">状態</th>
                <th className="px-3 py-3 font-medium">順</th>
                <th className="px-3 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const url = posterPublicUrl(p.image_path);
                const left = remaining(p);
                return (
                  <tr key={p.id} className="border-b border-hair last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-9 flex-none items-center justify-center overflow-hidden rounded-sm bg-hair">
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Storage 公開画像のサムネ
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {p.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {money(p.price_cents, "en", p.currency)}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-subtle">
                      {p.sold_count} / {p.edition_size}
                      <span className="ml-1 text-muted">（残 {left}）</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-hair px-2 py-[2px] text-[11px] text-subtle">
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted">{p.sort_order}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="rounded-full border border-hair px-3 py-1 text-[11px] transition-colors hover:border-ink"
                        >
                          編集
                        </Link>
                        {p.status === "archived" ? (
                          <form action={unarchiveProductAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              disabled={left <= 0}
                              className="rounded-full border border-hair px-3 py-1 text-[11px] transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                              title={left <= 0 ? "残数が無いため解除できません" : undefined}
                            >
                              解除
                            </button>
                          </form>
                        ) : (
                          <form action={archiveProductAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-hair px-3 py-1 text-[11px] transition-colors hover:border-ink"
                            >
                              アーカイブ
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

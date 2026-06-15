// 注文一覧 `/admin/orders`。読み取りのみ（返金等は当面 Stripe ダッシュボード）。
import { listAdminOrders } from "@/lib/admin/orders";
import { money } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  pending: "保留",
  paid: "支払い済み",
  fulfilled: "発送済み",
  canceled: "キャンセル",
  refunded: "返金済み",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold tracking-[0.01em]">注文</h1>

      {orders.length === 0 ? (
        <p className="rounded-[10px] border border-hair px-4 py-8 text-center text-[13px] text-muted">
          注文がありません。Supabase 接続後・決済実装（Phase 3）後に表示されます。
        </p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-hair">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hair text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-3 py-3 font-medium">日付</th>
                <th className="px-3 py-3 font-medium">メール</th>
                <th className="px-3 py-3 font-medium">商品 × 数量</th>
                <th className="px-3 py-3 font-medium">合計</th>
                <th className="px-3 py-3 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-hair last:border-b-0 align-top">
                  <td className="px-3 py-3 tabular-nums text-subtle">
                    {formatDate(o.created_at)}
                  </td>
                  <td className="px-3 py-3">{o.email ?? "—"}</td>
                  <td className="px-3 py-3 text-subtle">
                    {o.order_items.map((it) => (
                      <div key={it.id}>
                        {it.title_snapshot} × {it.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {money(o.amount_total_cents, "en", o.currency)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-hair px-2 py-[2px] text-[11px] text-subtle">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

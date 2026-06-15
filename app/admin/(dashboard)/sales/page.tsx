// 売上 `/admin/sales`（簡易）。合計売上（paid のみ）+ 商品別の販売数/売上（docs/07）。
import { getSalesSummary } from "@/lib/admin/orders";
import { money } from "@/lib/format";

export default async function AdminSalesPage() {
  const s = await getSalesSummary();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold tracking-[0.01em]">売上</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:max-w-[480px]">
        <div className="rounded-[10px] border border-hair px-4 py-5">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted">合計売上（支払い済み）</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {money(s.totalPaidCents, "en", s.currency)}
          </div>
        </div>
        <div className="rounded-[10px] border border-hair px-4 py-5">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted">注文数（支払い済み）</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{s.paidOrderCount}</div>
        </div>
      </div>

      <h2 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted">商品別</h2>
      {s.perProduct.length === 0 ? (
        <p className="rounded-[10px] border border-hair px-4 py-8 text-center text-[13px] text-muted">
          支払い済みの注文がありません。Supabase 接続・決済（Phase 3）後に集計されます。
        </p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-hair sm:max-w-[480px]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hair text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-3 py-3 font-medium">作品</th>
                <th className="px-3 py-3 font-medium text-right">販売数</th>
                <th className="px-3 py-3 font-medium text-right">売上</th>
              </tr>
            </thead>
            <tbody>
              {s.perProduct.map((p) => (
                <tr key={p.title} className="border-b border-hair last:border-b-0">
                  <td className="px-3 py-3">{p.title}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{p.quantity}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {money(p.revenueCents, "en", s.currency)}
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

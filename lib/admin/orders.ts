// 管理画面用の orders 取得（admin RLS 読み取り。service role 不要）。
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OrderItem = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  title_snapshot: string;
};

export type Order = {
  id: string;
  stripe_payment_intent_id: string | null;
  email: string | null;
  status: string;
  amount_total_cents: number;
  currency: string;
  created_at: string;
  order_items: OrderItem[];
};

const ORDER_COLUMNS =
  "id, stripe_payment_intent_id, email, status, amount_total_cents, currency, created_at, order_items(id, quantity, unit_price_cents, title_snapshot)";

/** 注文一覧（新しい順）。明細をネストして取得。 */
export async function listAdminOrders(): Promise<Order[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Order[];
}

export type SalesSummary = {
  totalPaidCents: number;
  paidOrderCount: number;
  perProduct: { title: string; quantity: number; revenueCents: number }[];
  currency: string;
};

/** 売上集計（paid のみ）。合計売上 + 商品別の販売数/売上（docs/07 簡易版）。 */
export async function getSalesSummary(): Promise<SalesSummary> {
  const empty: SalesSummary = {
    totalPaidCents: 0,
    paidOrderCount: 0,
    perProduct: [],
    currency: "usd",
  };
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return empty;
  }

  const orders = await listAdminOrders();
  const paid = orders.filter((o) => o.status === "paid");

  const totalPaidCents = paid.reduce((s, o) => s + o.amount_total_cents, 0);
  const byTitle = new Map<string, { quantity: number; revenueCents: number }>();
  for (const o of paid) {
    for (const it of o.order_items) {
      const cur = byTitle.get(it.title_snapshot) ?? {
        quantity: 0,
        revenueCents: 0,
      };
      cur.quantity += it.quantity;
      cur.revenueCents += it.quantity * it.unit_price_cents;
      byTitle.set(it.title_snapshot, cur);
    }
  }

  return {
    totalPaidCents,
    paidOrderCount: paid.length,
    perProduct: [...byTitle.entries()]
      .map(([title, v]) => ({ title, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents),
    currency: paid[0]?.currency ?? "usd",
  };
}

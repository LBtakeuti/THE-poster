import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { money } from "@/lib/format";
import { sendEmail } from "./email";
import { notifyAdminLine } from "./line";

interface OrderItemRow {
  quantity: number;
  unit_price_cents: number;
  title_snapshot: string;
}

export function buildItemLines(items: OrderItemRow[]): string {
  return items
    .map(
      (it) =>
        `${it.title_snapshot} × ${it.quantity} — ${money(it.unit_price_cents * it.quantity, "ja")}`,
    )
    .join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildOrderEmailHtml(args: {
  orderId: string;
  lines: string;
  total: string;
}): string {
  const itemsHtml = args.lines
    .split("\n")
    .filter(Boolean)
    .map((l) => `<li style="margin:4px 0;">${escapeHtml(l)}</li>`)
    .join("");
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#171513;padding:8px;">
  <h1 style="font-size:18px;letter-spacing:0.04em;margin:0 0 12px;">THE POSTER</h1>
  <p>ご注文ありがとうございます。下記の内容で承りました。</p>
  <ul style="list-style:none;padding:0;">${itemsHtml}</ul>
  <p style="font-weight:600;">合計: ${escapeHtml(args.total)}</p>
  <p style="color:#9a948c;font-size:12px;">注文ID: ${escapeHtml(args.orderId)}</p>
  <p style="color:#9a948c;font-size:12px;">商品は3〜5営業日以内に発送します。</p>
  </body></html>`;
}

// 決済成功した注文の通知（購入者メール＋管理者LINE）。例外は呼び出し側で握る。
export async function notifyPaidOrder(db: SupabaseClient, orderId: string): Promise<void> {
  const { data: order } = await db
    .from("orders")
    .select(
      "id, email, amount_total_cents, order_items(quantity, unit_price_cents, title_snapshot)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const items = (order.order_items ?? []) as OrderItemRow[];
  const lines = buildItemLines(items);
  const total = money(order.amount_total_cents ?? 0, "ja");

  // 1) 購入者へ確認メール
  if (order.email) {
    await sendEmail({
      to: order.email,
      subject: "THE POSTER — ご注文ありがとうございます",
      html: buildOrderEmailHtml({ orderId: order.id, lines, total }),
    });
  }

  // 2) 管理者へ LINE 通知
  await notifyAdminLine(
    `🛒 新規注文\n注文ID: ${order.id}\n${lines}\n合計: ${total}\n購入者: ${order.email ?? "-"}`,
  );
}

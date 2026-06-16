// POST /api/stripe/webhook
// 在庫を確定する唯一の経路（不変条件1）。docs/05・08。
// runtime=nodejs・raw body で署名検証 → payment_intent.succeeded で commit_order_stock。
//   成功→paid（trigger が売り切れを archived 化）/ insufficient_stock→refund+canceled。
//   payment_failed→canceled。冪等（既に paid なら no-op、stripe_payment_intent_id unique も保険）。
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, isStripeWebhookConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "stripe_webhook_not_configured" },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const body = await req.text(); // raw body
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    // 署名検証失敗は 400（Stripe は再送する）。
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const db = createServiceClient();

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;
    if (!orderId) return NextResponse.json({ received: true });

    // 冪等性: 既に paid なら何もしない。
    const { data: order } = await db
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ received: true });
    if (order.status === "paid") return NextResponse.json({ received: true });

    // 在庫を確定（原子的オーバーセルガード）。
    const { error: commitErr } = await db.rpc("commit_order_stock", {
      p_order_id: orderId,
    });

    if (commitErr) {
      // insufficient_stock 等 → 即返金 + 注文 canceled（不変条件2）。
      // idempotencyKey を PI 単位で固定し、webhook 再送時の多重 refund を防ぐ。
      try {
        await stripe.refunds.create(
          { payment_intent: pi.id },
          { idempotencyKey: `refund_${pi.id}` },
        );
      } catch {
        // 返金 API 失敗時はログのみ（後続で手動対応）。ここでは握りつぶさず 500 で再送させる。
        return NextResponse.json({ error: "refund_failed" }, { status: 500 });
      }
      await db.from("orders").update({ status: "canceled" }).eq("id", orderId);
      return NextResponse.json({ received: true });
    }

    // 成功（commit_order_stock 内で status=paid に更新済み）。
    return NextResponse.json({ received: true });
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;
    if (orderId) {
      // 在庫は触っていないので戻す処理は不要。注文を canceled に。
      await db.from("orders").update({ status: "canceled" }).eq("id", orderId);
    }
    return NextResponse.json({ received: true });
  }

  // それ以外のイベントは 200 で受理（無視）。
  return NextResponse.json({ received: true });
}

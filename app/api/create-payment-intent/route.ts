// POST /api/create-payment-intent
// 注文を下書き作成し Stripe PaymentIntent を返す（docs/05・08）。
// 不変条件: orders/order_items の書き込みは service role のみ（4）。金額はサーバー価格で計算（信用しない）。
//           在庫はここでは減らさない（減算は webhook→commit_order_stock のみ・不変条件1）。
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, isStripeServerConfigured } from "@/lib/stripe";
import { SHIPPING_CENTS, CHECKOUT_CURRENCY } from "@/lib/checkout/shipping";

export const runtime = "nodejs";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  email: z.string().email(),
  locale: z.enum(["ja", "en"]),
});

export async function POST(req: Request) {
  // キー未投入でも build は通る。実行時に未設定なら 503 を返す。
  if (!isStripeServerConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "supabase_not_configured" },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { items, email, locale } = parsed.data;

  const db = createServiceClient();

  // 対象 products を取得し、サーバー側で在庫・公開状態・価格を確定する。
  const ids = items.map((i) => i.product_id);
  const { data: products, error: prodErr } = await db
    .from("products")
    .select("id, title, price_cents, edition_size, sold_count, status, currency")
    .in("id", ids);

  if (prodErr || !products) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const byId = new Map(products.map((p) => [p.id, p]));

  let totalCents = 0;
  // 注文通貨は商品の currency を正とする（表示・請求の乖離を防ぐ）。
  // 1 注文内は単一通貨に限定する（混在は 400）。
  let orderCurrency: string | null = null;
  const lineItems: {
    product_id: string;
    quantity: number;
    unit_price_cents: number;
    title_snapshot: string;
  }[] = [];

  for (const item of items) {
    const p = byId.get(item.product_id);
    // 非公開・存在しない・在庫不足は 409（事前チェック。最終整合は webhook が担保）。
    if (!p || p.status !== "active") {
      return NextResponse.json(
        { error: "unavailable", product_id: item.product_id },
        { status: 409 },
      );
    }
    const remaining = p.edition_size - p.sold_count;
    if (remaining < item.quantity) {
      return NextResponse.json(
        { error: "unavailable", product_id: item.product_id },
        { status: 409 },
      );
    }
    const currency = (p.currency ?? CHECKOUT_CURRENCY).toLowerCase();
    if (orderCurrency === null) {
      orderCurrency = currency;
    } else if (orderCurrency !== currency) {
      return NextResponse.json({ error: "mixed_currency" }, { status: 400 });
    }
    totalCents += p.price_cents * item.quantity;
    lineItems.push({
      product_id: p.id,
      quantity: item.quantity,
      unit_price_cents: p.price_cents,
      title_snapshot: p.title,
    });
  }

  // 送料はチェックアウト通貨建て。現状は単一通貨運用のため通貨一致を前提とする。
  totalCents += SHIPPING_CENTS;
  const currency = orderCurrency ?? CHECKOUT_CURRENCY;

  // orders(pending) を作成。
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      email,
      status: "pending",
      amount_total_cents: totalCents,
      currency,
      locale,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "order_failed" }, { status: 500 });
  }

  // order_items（価格・タイトルのスナップショット）を作成。
  const { error: itemsErr } = await db.from("order_items").insert(
    lineItems.map((li) => ({
      order_id: order.id,
      product_id: li.product_id,
      quantity: li.quantity,
      unit_price_cents: li.unit_price_cents,
      title_snapshot: li.title_snapshot,
    })),
  );
  if (itemsErr) {
    // 明細作成に失敗したら下書き注文を片付ける（cascade で items も消える）。
    await db.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "order_items_failed" }, { status: 500 });
  }

  // Stripe PaymentIntent を作成し metadata に order_id を付与。
  try {
    const pi = await getStripe().paymentIntents.create({
      amount: totalCents,
      currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: { order_id: order.id },
    });

    await db
      .from("orders")
      .update({
        stripe_payment_intent_id: pi.id,
        amount_total_cents: totalCents,
      })
      .eq("id", order.id);

    return NextResponse.json({
      clientSecret: pi.client_secret,
      orderId: order.id,
      amount: totalCents,
    });
  } catch {
    await db.from("orders").update({ status: "canceled" }).eq("id", order.id);
    return NextResponse.json({ error: "stripe_failed" }, { status: 500 });
  }
}

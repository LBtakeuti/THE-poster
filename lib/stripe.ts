// サーバー専用 Stripe クライアント。STRIPE_SECRET_KEY はクライアントへ出さない（不変条件 3）。
// PaymentIntent 作成 / webhook 署名検証 / refund で使用。
import "server-only";
import Stripe from "stripe";

// 遅延初期化。STRIPE_SECRET_KEY 未投入でも import 時に例外を出さない（build を通す）。
// 実行時に未設定なら呼び出し側が isStripeServerConfigured() で 503 を返す。
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      // apiVersion は未指定にしてアカウント既定を使う。
      typescript: true,
    });
  }
  return _stripe;
}

/** STRIPE_SECRET_KEY が設定されているか（PaymentIntent 作成など決済 API の可否）。 */
export function isStripeServerConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

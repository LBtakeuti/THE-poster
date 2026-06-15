// サーバー専用 Stripe クライアント。STRIPE_SECRET_KEY はクライアントへ出さない（不変条件 3）。
// PaymentIntent 作成 / webhook 署名検証 / refund で使用。
import "server-only";
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  // apiVersion は未指定にしてアカウント既定を使う。
  // 固定したい場合は Stripe ダッシュボードの値に合わせて指定する。
  typescript: true,
});

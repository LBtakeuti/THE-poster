// 完了 `/checkout/complete`（docs/06）。
// Stripe の return_url から payment_intent_client_secret 等が付与される。
// PaymentIntent の状態を見て「ありがとうございました」を表示する。
import { Suspense } from "react";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { CompleteStatus } from "@/components/checkout/CompleteStatus";

export default function CheckoutCompletePage() {
  return (
    <main className="min-h-screen">
      <CheckoutHeader />
      <Suspense fallback={null}>
        <CompleteStatus />
      </Suspense>
    </main>
  );
}

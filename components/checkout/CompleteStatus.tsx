"use client";

// PaymentIntent の状態を読み取り、完了表示を出す（docs/06）。
// return_url に付く payment_intent_client_secret から retrievePaymentIntent して status を見る。
// 公開鍵が無い場合やパラメータ欠如時は中立メッセージ。
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { useI18n } from "@/lib/i18n/context";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type View = "loading" | "success" | "processing" | "failed";

export function CompleteStatus() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [view, setView] = useState<View>("loading");

  const clientSecret = params.get("payment_intent_client_secret");
  const redirectStatus = params.get("redirect_status");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // 公開鍵 or clientSecret が無ければ redirect_status をフォールバックに使う。
      if (!stripePromise || !clientSecret) {
        setView(redirectStatus === "succeeded" ? "success" : "processing");
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) {
        setView("processing");
        return;
      }
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      if (cancelled) return;
      switch (paymentIntent?.status) {
        case "succeeded":
          setView("success");
          break;
        case "processing":
          setView("processing");
          break;
        default:
          setView("failed");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [clientSecret, redirectStatus]);

  return (
    <div className="mx-auto my-[60px] max-w-[520px] px-6 text-center">
      <div className="mx-auto mb-[22px] flex h-[46px] w-[46px] items-center justify-center rounded-full border-[1.6px] border-ink text-xl">
        {view === "success" ? "✓" : view === "failed" ? "!" : "…"}
      </div>
      <h2 className="mb-3 text-[22px] font-semibold">
        {view === "success"
          ? t.thanks
          : view === "failed"
            ? t.validate
            : t.processing}
      </h2>
      {view === "success" ? (
        <p className="text-[13px] leading-[1.7] text-subtle">{t.confirmSub}</p>
      ) : null}
      <Link
        href="/"
        className="mt-6 inline-block rounded-full border border-ink bg-ink px-[18px] py-2 text-[11px] font-medium tracking-[0.06em] text-white transition hover:-translate-y-px"
      >
        {t.continueShopping}
      </Link>
    </div>
  );
}

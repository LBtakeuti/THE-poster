"use client";

// チェックアウトのフォーム + Payment Element（docs/05・06）。
// 2カラム（左フォーム / 右 sticky サマリー）。数量ステッパー（1〜残数）。
// 公開鍵が無い場合は Payment Element を安全に無効表示にする（キー投入後に有効化）。
// 秘密鍵はサーバー専用。ここでは NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY のみ使用。
import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useI18n } from "@/lib/i18n/context";
import { money } from "@/lib/format";
import type { Product } from "@/lib/products-shared";
import { remaining } from "@/lib/products-shared";

type CheckoutFormProps = {
  product: Product;
  shippingCents: number;
  siteUrl: string;
};

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// loadStripe はモジュールスコープで1度だけ。鍵が無ければ null（無効表示）。
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export function CheckoutForm({
  product,
  shippingCents,
  siteUrl,
}: CheckoutFormProps) {
  const { t, locale } = useI18n();
  const max = remaining(product);
  const [qty, setQty] = useState(1);

  const subtotal = product.price_cents * qty;
  const total = subtotal + shippingCents;

  // Payment Element は deferred mode（amount/currency をクライアントで提示、確定時にサーバーで PI 作成）。
  const elementsOptions = useMemo(
    () => ({
      mode: "payment" as const,
      amount: total,
      currency: product.currency,
      locale: (locale === "ja" ? "ja" : "en") as "ja" | "en",
      appearance: {
        theme: "flat" as const,
        variables: {
          colorPrimary: "#171513",
          colorText: "#171513",
          colorBackground: "#ffffff",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          borderRadius: "8px",
        },
      },
    }),
    [total, product.currency, locale],
  );

  return (
    <div className="mx-auto grid max-w-[980px] grid-cols-1 gap-9 px-5 pb-20 pt-[18px] min-[781px]:grid-cols-[1.15fr_.85fr] min-[781px]:gap-14 min-[781px]:px-8 min-[781px]:pb-[90px]">
      <div className="max-[780px]:order-2">
        <h1 className="mb-6 mt-[6px] text-2xl font-semibold tracking-[0.01em]">
          {t.checkout}
        </h1>
        {stripePromise ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <PaymentSection
              product={product}
              qty={qty}
              total={total}
              siteUrl={siteUrl}
            />
          </Elements>
        ) : (
          <DisabledPaymentSection total={total} />
        )}
      </div>

      <OrderSummary
        product={product}
        qty={qty}
        setQty={setQty}
        max={max}
        subtotal={subtotal}
        shippingCents={shippingCents}
        total={total}
      />
    </div>
  );
}

// ---- 入力フォーム + Payment Element + Pay ボタン（鍵あり） ----
function PaymentSection({
  product,
  qty,
  total,
  siteUrl,
}: {
  product: Product;
  qty: number;
  total: number;
  siteUrl: string;
}) {
  const { t, locale } = useI18n();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handlePay(formData: FormData) {
    if (!stripe || !elements) return;
    setError(null);

    const email = String(formData.get("email") ?? "");
    const name = String(formData.get("name") ?? "");
    const addr = String(formData.get("addr") ?? "");
    if (!email.includes("@") || !name || !addr) {
      setError(t.validate);
      return;
    }

    setProcessing(true);

    // Payment Element 側の入力検証。
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? t.validate);
      setProcessing(false);
      return;
    }

    // サーバーで PaymentIntent を作成し clientSecret を得る。
    let clientSecret: string;
    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: qty }],
          email,
          locale,
        }),
      });
      if (!res.ok) {
        setError(t.validate);
        setProcessing(false);
        return;
      }
      const data = (await res.json()) as { clientSecret: string };
      clientSecret = data.clientSecret;
    } catch {
      setError(t.validate);
      setProcessing(false);
      return;
    }

    // 確定（return_url 付き）。成功後 /checkout/complete へ遷移する。
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: `${siteUrl}/checkout/complete` },
    });
    if (confirmError) {
      setError(confirmError.message ?? t.validate);
      setProcessing(false);
    }
  }

  return (
    <form action={handlePay} className="flex flex-col">
      <ContactAndShippingFields />

      <section className="mb-[30px]">
        <h3 className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {t.payment}
        </h3>
        <div className="rounded-[10px] border border-line p-[14px]">
          <PaymentElement />
        </div>
      </section>

      {error ? <p className="mb-3 text-[12px] text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={processing || !stripe}
        className="mt-2 rounded-xl bg-ink px-4 py-[15px] text-sm font-semibold tracking-[0.04em] text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
      >
        {processing ? t.processing : t.pay(money(total, locale, product.currency))}
      </button>
      <div className="mt-[14px] text-center text-[10.5px] tracking-[0.06em] text-muted">
        {t.secured}
      </div>
    </form>
  );
}

// ---- 公開鍵が無い場合の無効表示（キー投入後に有効化） ----
function DisabledPaymentSection({ total }: { total: number }) {
  const { t, locale } = useI18n();
  return (
    <div className="flex flex-col">
      <ContactAndShippingFields disabled />
      <section className="mb-[30px]">
        <h3 className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {t.payment}
        </h3>
        <div className="rounded-[10px] border border-line p-[14px]">
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between border-b border-hair py-[10px] text-[13px] tracking-[0.05em] text-muted">
              <span>Card number</span>
              <span>•••• •••• •••• ••••</span>
            </div>
            <div className="flex items-center justify-between border-b border-hair py-[10px] text-[13px] tracking-[0.05em] text-muted">
              <span>Expiry</span>
              <span>MM / YY</span>
            </div>
            <div className="flex items-center justify-between py-[10px] text-[13px] tracking-[0.05em] text-muted">
              <span>CVC</span>
              <span>•••</span>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-[1.5] text-muted">
            決済はまだ有効化されていません（Stripe 公開鍵 未設定）。キー投入後に Payment Element が表示されます。
          </p>
        </div>
      </section>
      <button
        type="button"
        disabled
        className="mt-2 cursor-not-allowed rounded-xl bg-ink px-4 py-[15px] text-sm font-semibold tracking-[0.04em] text-white opacity-45"
      >
        {t.pay(money(total, locale))}
      </button>
      <div className="mt-[14px] text-center text-[10.5px] tracking-[0.06em] text-muted">
        {t.secured}
      </div>
    </div>
  );
}

// ---- 連絡先 + お届け先（国なし。プロト L341-351） ----
function ContactAndShippingFields({ disabled }: { disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <section className="mb-[30px]">
        <h3 className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {t.contact}
        </h3>
        <FieldInput name="email" label={t.email} type="email" autoComplete="email" disabled={disabled} />
      </section>
      <section className="mb-[30px]">
        <h3 className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {t.shippingAddress}
        </h3>
        <FieldInput name="name" label={t.fullName} autoComplete="name" disabled={disabled} />
        <FieldInput name="addr" label={t.address} autoComplete="address-line1" disabled={disabled} />
        <FieldInput name="addr2" label={t.addressLine2} autoComplete="address-line2" disabled={disabled} />
        <div className="grid grid-cols-2 gap-3 min-[481px]:grid-cols-[1.4fr_1fr_1fr]">
          <FieldInput name="city" label={t.city} autoComplete="address-level2" disabled={disabled} />
          <FieldInput name="state" label={t.region} autoComplete="address-level1" disabled={disabled} />
          <FieldInput name="zip" label={t.postalCode} autoComplete="postal-code" disabled={disabled} />
        </div>
      </section>
    </>
  );
}

function FieldInput({
  name,
  label,
  type = "text",
  autoComplete,
  disabled,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-[6px] block text-[11px] tracking-[0.04em] text-subtle">
        {label}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full rounded-[10px] border border-line bg-white px-[13px] py-3 text-sm text-ink outline-none transition focus:border-ink focus:shadow-[0_0_0_3px_rgba(23,21,19,.06)] disabled:opacity-60"
      />
    </label>
  );
}

// ---- 右: 注文サマリー（sticky・数量ステッパー・小計/送料/合計） ----
function OrderSummary({
  product,
  qty,
  setQty,
  max,
  subtotal,
  shippingCents,
  total,
}: {
  product: Product;
  qty: number;
  setQty: (n: number) => void;
  max: number;
  subtotal: number;
  shippingCents: number;
  total: number;
}) {
  const { t, locale } = useI18n();
  return (
    <aside className="self-start border-hair max-[780px]:order-1 max-[780px]:border-b max-[780px]:pb-7 min-[781px]:sticky min-[781px]:top-6 min-[781px]:border-l min-[781px]:pl-10">
      <h3 className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        {t.orderSummary}
      </h3>
      <div className="flex items-start gap-4">
        <div className="h-[118px] w-[84px] flex-none rounded-sm bg-hair" />
        <div className="flex-1">
          <div className="text-sm font-semibold">{product.title}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">
            Riso · A2 · ed. {product.edition_size}
          </div>
          <div className="mt-3 inline-flex items-center rounded-full border border-line">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="h-[30px] w-[30px] text-base text-ink disabled:text-hair"
              aria-label="decrease quantity"
            >
              −
            </button>
            <span className="min-w-[30px] text-center text-[13px] tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(Math.min(max, qty + 1))}
              disabled={qty >= max}
              className="h-[30px] w-[30px] text-base text-ink disabled:text-hair"
              aria-label="increase quantity"
            >
              +
            </button>
          </div>
          <div className="mt-[6px] text-[10px] tracking-[0.03em] text-muted">
            {t.remaining(max, product.edition_size)}
          </div>
        </div>
      </div>

      <div className="mt-[26px] text-[13px]">
        <div className="flex justify-between py-[7px] text-subtle">
          <span>{t.subtotal}</span>
          <span className="tabular-nums">{money(subtotal, locale, product.currency)}</span>
        </div>
        <div className="flex justify-between py-[7px] text-subtle">
          <span>{t.shipping}</span>
          <span className="tabular-nums">{money(shippingCents, locale, product.currency)}</span>
        </div>
        <div className="mt-[6px] flex justify-between border-t border-hair pt-[14px] text-base font-semibold text-ink">
          <span>{t.total}</span>
          <span className="tabular-nums">{money(total, locale, product.currency)}</span>
        </div>
      </div>
    </aside>
  );
}

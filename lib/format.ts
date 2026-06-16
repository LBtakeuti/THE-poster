// 金額は最小単位（cents）の integer で扱う（不変条件 7）。
// 浮動小数で金額計算しない。表示のときだけロケールに合わせて整形する。
import type { Locale } from "./i18n/dictionary";

const CURRENCY_BY_LOCALE: Record<Locale, string> = {
  ja: "JPY",
  en: "USD",
};

/**
 * cents（最小通貨単位）を表示用文字列に整形する。
 * JPY は最小単位＝円なので 100 で割らない。USD などは 100 で割る。
 */
export function money(
  amountInCents: number,
  locale: Locale = "en",
  currency: string = CURRENCY_BY_LOCALE[locale],
): string {
  const upper = currency.toUpperCase();
  // ゼロ小数通貨（円・ウォン等）は最小単位がそのまま額面。
  const zeroDecimal = upper === "JPY" || upper === "KRW";
  const amount = zeroDecimal ? amountInCents : amountInCents / 100;

  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: upper,
  }).format(amount);
}

// ── 表示専用の固定換算（不変条件7を侵さない） ──────────────────────────
// これは「見た目だけ」の換算。実際の請求は必ず商品の通貨のまま行う
// （create-payment-intent / webhook / order_items のスナップショット）。
// レートは概算の固定値。為替の正確さは目的ではない（表示の親しみやすさのため）。
const DISPLAY_RATE_TO_USD: Record<string, number> = {
  USD: 1,
  JPY: 1 / 150, // 1 USD ≒ 150 JPY（表示用概算）
};

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW"]);

// cents（最小単位）→ 主要単位（円ならそのまま、ドルなら /100）。
function toMajorUnit(amountInCents: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency)
    ? amountInCents
    : amountInCents / 100;
}

/**
 * 表示専用: 商品通貨の金額を、ロケールの表示通貨（ja=JPY / en=USD）へ
 * 固定レートで換算して整形する。同一通貨・未知通貨はそのまま整形（安全側）。
 */
export function moneyLocalized(
  amountInCents: number,
  sourceCurrency: string,
  locale: Locale,
): string {
  const src = sourceCurrency.toUpperCase();
  const target = CURRENCY_BY_LOCALE[locale]; // ja:JPY / en:USD
  const srcRate = DISPLAY_RATE_TO_USD[src];
  const targetRate = DISPLAY_RATE_TO_USD[target];

  // 同一通貨、またはレート未知のときは換算しない。
  if (src === target || srcRate == null || targetRate == null) {
    return money(amountInCents, locale, sourceCurrency);
  }

  const usd = toMajorUnit(amountInCents, src) * srcRate;
  const targetMajor = usd / targetRate;
  // 表示用に target の最小単位へ戻す（JPY:整数 / USD:cents）。
  const targetCents = ZERO_DECIMAL_CURRENCIES.has(target)
    ? Math.round(targetMajor)
    : Math.round(targetMajor * 100);

  return money(targetCents, locale, target);
}

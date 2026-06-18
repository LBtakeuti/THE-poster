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

// ロケール判定の純関数（"use client" 非依存・サーバー/クライアント両方から安全に import 可能）。
// ※ "use client" モジュール（context.tsx）に置くと Server Component から呼べず実行時500になるため分離。
import type { Locale } from "./dictionary";

/** Accept-Language から初期ロケールを判定（'ja' 始まりなら ja、他は en）。 */
export function resolveLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): Locale {
  if (acceptLanguage && acceptLanguage.toLowerCase().startsWith("ja")) {
    return "ja";
  }
  return "en";
}

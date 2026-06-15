import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { I18nProvider, resolveLocaleFromAcceptLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yohaku",
  description: "Limited art prints.",
};

// 優先順: Cookie 'locale' > Accept-Language > 'en'（docs/09）。
async function resolveInitialLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale === "ja" || cookieLocale === "en") {
    return cookieLocale;
  }
  const headerStore = await headers();
  return resolveLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialLocale = await resolveInitialLocale();

  return (
    <html lang={initialLocale}>
      <body className="bg-paper text-ink font-sans antialiased">
        <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}

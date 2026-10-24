import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { directionOf, routing, type Locale } from "@/i18n/routing";
import { alternates, siteUrl } from "@/lib/seo";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

// No page is rendered at build time (no database access during `next build`); each one is
// rendered on its first visit and then revalidated (ISR).
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    applicationName: "ROYAL INK",
    alternates: alternates(locale, ""),
    openGraph: { siteName: "ROYAL INK", type: "website", locale: { ar: "ar_DZ", fr: "fr_DZ", en: "en" }[locale] },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <html lang={locale} dir={directionOf(locale as Locale)} className={`${inter.variable} ${plexArabic.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only z-[60] rounded-control bg-ink px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
          >
            {t("skipToContent")}
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

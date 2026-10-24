import { BadgeCheck, Banknote } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Availability } from "@/components/store/availability";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { AddToCart } from "@/components/store/cart/add-to-cart";
import { Gallery } from "@/components/store/gallery";
import { OriginBadge } from "@/components/store/origin-badge";
import { Amount, Price } from "@/components/store/price";
import { ProductGrid } from "@/components/store/product-card";
import { Section, SectionHeader } from "@/components/store/section";
import {
  getAlternatives, getCategory, getCompatiblePrinters, getProduct, getReviews, getReviewsEnabled, getVariants,
} from "@/features/catalog/queries";
import type { CompatiblePrinter, ProductDetail } from "@/features/catalog/types";
import { parseSearchParams } from "@/features/search/params";
import { searchProducts } from "@/features/search/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatInteger } from "@/lib/format";
import { pick, type Localized } from "@/lib/localized";
import { alternates, siteUrl } from "@/lib/seo";
import { publicStorageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/p/[slug]">): Promise<Metadata> {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const product = await getProduct(slug);
  if (!product) return {};
  const title = pick(product.seo.title, locale) || pick(product.name, locale);
  const description = pick(product.seo.description, locale) || pick(product.short_description, locale) || undefined;
  const image = publicStorageUrl("product-images", product.images[0]?.storage_path);
  return {
    title,
    description,
    alternates: alternates(locale, `/p/${slug}`),
    openGraph: { title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/p/[slug]">) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  if (!product) notFound();

  const t = await getTranslations("product");
  const tYields = await getTranslations("yields");
  const [categoryData, printers, variants, alternativesList, related, reviewsEnabled] = await Promise.all([
    getCategory(product.category.slug),
    getCompatiblePrinters(product.id),
    product.group_id ? getVariants(product.group_id) : Promise.resolve([]),
    getAlternatives(product),
    searchProducts({ ...parseSearchParams({}), category: product.category.slug }, { limit: 9 }),
    getReviewsEnabled(),
  ]);
  const reviews = reviewsEnabled ? await getReviews(product.id) : [];
  const relatedItems = related.items.filter((p) => p.id !== product.id && !alternativesList.some((a) => a.id === p.id)).slice(0, 8);

  const name = pick(product.name, locale);
  const images = product.images
    .map((img, i) => ({ src: publicStorageUrl("product-images", img.storage_path), alt: pick(img.alt, locale) || (i === 0 ? name : `${name} (${i + 1})`) }))
    .filter((img): img is { src: string; alt: string } => img.src !== null);

  const crumbs = [
    ...(categoryData?.ancestors ?? []).map((c) => ({ label: pick(c.name, locale), href: `/c/${c.slug}` })),
    { label: pick(product.category.name, locale), href: `/c/${product.category.slug}` },
    { label: name },
  ];

  return (
    <>
      <ProductJsonLd product={product} name={name} images={images.map((i) => i.src)} locale={locale} />
      <div className="container-ri pt-6 md:pt-10">
        <Breadcrumbs items={crumbs} />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <Gallery
            images={images}
            fallbackAlt={name}
            type={product.product_type}
          />

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
                {product.brand ? (
                  <Link href={`/brands/${product.brand.slug}`} className="font-medium text-ink hover:underline">{product.brand.name}</Link>
                ) : null}
                {product.model_code ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{t("code")} <span className="code font-medium text-ink">{product.model_code}</span></span>
                  </>
                ) : null}
              </p>
              <h1 className="display text-2xl md:text-3xl">{name}</h1>
              {product.variant_label ? <p className="text-ink-2">{pick(product.variant_label, locale)}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <OriginBadge origin={product.origin} />
                {product.yield_type ? <span className="text-sm text-ink-2">{tYields(product.yield_type)}</span> : null}
                {product.page_yield ? <span className="text-sm text-ink-2">· {t("yield", { pages: formatInteger(product.page_yield) })}</span> : null}
                {product.volume_ml ? <span className="text-sm text-ink-2">· {t("volume", { ml: formatInteger(product.volume_ml) })}</span> : null}
              </div>
            </div>

            {product.short_description ? <p className="max-w-[68ch] text-ink-2">{pick(product.short_description, locale)}</p> : null}

            <div className="space-y-3 border-y border-line py-5">
              <Price price={product.price_dzd} compareAt={product.compare_at_dzd} locale={locale} size="lg" />
              <Availability inStock={product.in_stock} lowStock={product.low_stock} className="text-sm" />
              <div className="pt-2">
                <AddToCart productId={product.id} available={product.in_stock} />
              </div>
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <Banknote className="size-4 shrink-0" aria-hidden />
                {t("codDelivery")}
              </p>
            </div>

            {variants.length > 1 ? <Variants variants={variants} current={product.id} locale={locale} title={t("variants")} /> : null}

            {product.tiers.length > 0 ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold">{t("volumePricing")}</h2>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-line">
                    {product.tiers.map((tier) => (
                      <tr key={`${tier.min_quantity}-${tier.business_only}`}>
                        <td className="py-2">{t("tierQuantity", { count: tier.min_quantity })}</td>
                        <td className="py-2 text-ink-2">{tier.business_only ? t("tierBusiness") : t("tierEveryone")}</td>
                        <td className="py-2 text-end font-medium"><Amount value={tier.price_dzd} locale={locale} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <CompatibilitySummary printers={printers} title={t("compatibility")} />
          </div>
        </div>
      </div>

      <Section aria-labelledby="details">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-10">
            {product.description ? (
              <div>
                <h2 id="details" className="mb-3 text-xl font-semibold">{t("description")}</h2>
                <div className="max-w-[68ch] space-y-3 whitespace-pre-line text-ink-2">{pick(product.description, locale)}</div>
              </div>
            ) : null}
            <Specs product={product} locale={locale} />
          </div>
          <CompatibilityList printers={printers} />
        </div>
      </Section>

      {alternativesList.length > 0 ? (
        <Section aria-labelledby="alternatives" className="pt-0 md:pt-0">
          <SectionHeader id="alternatives" title={t("alternatives")} subtitle={product.origin === "original" ? t("alternativesCompatible") : t("alternativesOriginal")} />
          <ProductGrid products={alternativesList} />
        </Section>
      ) : null}

      {relatedItems.length > 0 ? (
        <Section aria-labelledby="related" className="pt-0 md:pt-0">
          <SectionHeader id="related" title={t("related")} href={`/c/${product.category.slug}`} linkLabel={pick(product.category.name, locale)} />
          <ProductGrid products={relatedItems} />
        </Section>
      ) : null}

      {reviewsEnabled ? (
        <Section aria-labelledby="reviews" className="pt-0 md:pt-0">
          <SectionHeader id="reviews" title={t("reviews")} />
          {reviews.length === 0 ? (
            <p className="text-ink-2">{t("noReviews")}</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-card border border-line p-5">
                  <p className="text-sm font-medium" aria-label={t("rating", { rating: r.rating })}>
                    <span aria-hidden className="text-accent">{"★".repeat(r.rating)}</span>
                    <span aria-hidden className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  {r.title ? <p className="mt-2 font-semibold">{r.title}</p> : null}
                  {r.body ? <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{r.body}</p> : null}
                  {r.verified_purchase ? <p className="mt-3 text-xs text-success">{t("verifiedPurchase")}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}
    </>
  );
}

function Variants({
  variants,
  current,
  locale,
  title,
}: {
  variants: Awaited<ReturnType<typeof getVariants>>;
  current: string;
  locale: Locale;
  title: string;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <li key={v.id}>
            <Link
              href={`/p/${v.slug}`}
              aria-current={v.id === current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-full border px-4 text-sm",
                v.id === current ? "border-ink font-medium" : "border-line hover:border-ink",
              )}
            >
              {pick(v.variant_label, locale) || pick(v.name, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Specs({ product, locale }: { product: ProductDetail; locale: Locale }) {
  const t = await getTranslations("product");
  const tTypes = await getTranslations("types");
  const tColors = await getTranslations("colors");
  const tOrigins = await getTranslations("origins");
  const tYields = await getTranslations("yields");
  const rows: [string, React.ReactNode][] = [];
  rows.push([t("type"), tTypes(product.product_type)]);
  if (product.brand) rows.push([t("brand"), product.brand.name]);
  if (product.origin) rows.push([t("originLabel"), tOrigins(product.origin)]);
  if (product.model_code) rows.push([t("code"), <span key="c" className="code">{product.model_code}</span>]);
  if (product.oem_reference) rows.push([t("oemReference"), <span key="o" className="code">{product.oem_reference}</span>]);
  rows.push([t("sku"), <span key="s" className="code">{product.sku}</span>]);
  if (product.color && product.color !== "none") rows.push([t("colour"), tColors(product.color)]);
  if (product.yield_type) rows.push([t("yieldType"), tYields(product.yield_type)]);
  if (product.page_yield) rows.push([t("pageYield"), t("yield", { pages: formatInteger(product.page_yield) })]);
  if (product.volume_ml) rows.push([t("volumeLabel"), t("volume", { ml: formatInteger(product.volume_ml) })]);
  if (product.pack_size > 1) rows.push([t("packSize"), t("pack", { count: product.pack_size })]);
  // Free-form specifications entered by staff: {"Interface": "USB"} or {"Interface": {"fr": "...", "ar": "..."}}.
  for (const [key, value] of Object.entries(product.specs ?? {})) {
    const text =
      typeof value === "string" || typeof value === "number" ? String(value)
      : value && typeof value === "object" ? pick(value as Localized, locale)
      : "";
    if (text) rows.push([key, text]);
  }
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">{t("specs")}</h2>
      <dl className="divide-y divide-line border-y border-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(8rem,40%)_1fr] gap-4 py-2.5">
            <dt className="text-ink-2">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Short list next to the price: the first few verified printers. */
async function CompatibilitySummary({ printers, title }: { printers: CompatiblePrinter[]; title: string }) {
  if (printers.length === 0) return null;
  const t = await getTranslations("product");
  const shown = printers.slice(0, 3);
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ul className="space-y-1.5">
        {shown.map((p) => (
          <li key={p.printer_id}>
            <Link href={`/find-your-ink/printer/${p.slug}`} className="inline-flex items-center gap-2 text-sm text-success hover:underline">
              <BadgeCheck className="size-4 shrink-0" aria-hidden />
              {t.rich("verifiedWith", { printer: `${p.brand_name} ${p.model}`, code: (c) => <bdi className="code font-medium">{c}</bdi> })}
            </Link>
          </li>
        ))}
      </ul>
      {printers.length > shown.length ? (
        <a href="#compatibility" className="mt-2 inline-block text-sm font-medium underline-offset-4 hover:underline">
          +{printers.length - shown.length}
        </a>
      ) : null}
    </div>
  );
}

/** Full list of verified printers, grouped by brand and series. Unverified links never reach this page. */
async function CompatibilityList({ printers }: { printers: CompatiblePrinter[] }) {
  const t = await getTranslations("product");
  const groups = new Map<string, CompatiblePrinter[]>();
  for (const p of printers) {
    const key = p.series_name ? `${p.brand_name} ${p.series_name}` : p.brand_name;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return (
    <div id="compatibility" className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-semibold">{t("compatibility")}</h2>
      {printers.length === 0 ? (
        <p className="text-sm text-ink-2">{t("noCompatibility")}</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-2">{t("compatibilityIntro")}</p>
          <div className="space-y-5">
            {[...groups].map(([group, list]) => (
              <div key={group}>
                <h3 className="mb-2 text-sm font-semibold"><bdi>{group}</bdi></h3>
                <ul className="flex flex-wrap gap-2">
                  {list.map((p) => (
                    <li key={p.printer_id}>
                      <Link
                        href={`/find-your-ink/printer/${p.slug}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm hover:border-ink"
                      >
                        <BadgeCheck className="size-4 text-success" aria-hidden />
                        <span className="code">{p.model}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProductJsonLd({ product, name, images, locale }: { product: ProductDetail; name: string; images: string[]; locale: Locale }) {
  const site = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: product.sku,
    mpn: product.oem_reference ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    image: images.length ? images : undefined,
    description: pick(product.short_description, locale) || undefined,
    offers: {
      "@type": "Offer",
      url: `${site}/${locale}/p/${product.slug}`,
      priceCurrency: "DZD",
      price: product.price_dzd,
      availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  // Escape "<" so product text can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

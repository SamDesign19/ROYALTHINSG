import { ArrowRight, BadgeCheck, Banknote, Folder, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FindYourInk } from "@/components/store/find-your-ink";
import { HeroArt } from "@/components/store/hero-art";
import { ProductGrid } from "@/components/store/product-card";
import { Section, SectionHeader } from "@/components/store/section";
import { Button } from "@/components/ui/button";
import { getBanners, getBrands, getCategoryTree, getFeaturedProducts, getHomeCollections } from "@/features/catalog/queries";
import { parseSearchParams } from "@/features/search/params";
import { searchProducts } from "@/features/search/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localized";
import { publicStorageUrl } from "@/lib/storage";

export const revalidate = 60;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: l } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tt = await getTranslations("trust");
  const tc = await getTranslations("common");

  const [banners, tree, brands, featured, newest, collections] = await Promise.all([
    getBanners(),
    getCategoryTree(),
    getBrands(),
    getFeaturedProducts(8),
    searchProducts({ ...parseSearchParams({}), sort: "newest" }, { limit: 8 }),
    getHomeCollections(),
  ]);
  const banner = banners[0];
  const bannerImage = banner ? publicStorageUrl("banners", banner.image_path) : null;
  const printerBrands = brands.filter((b) => b.makes_printers).map((b) => ({ slug: b.slug, name: b.name }));

  return (
    <>
      {/* Hero: the first active banner from Admin → Marketing, or the brand message. */}
      <section className="container-ri pt-6 md:pt-10">
        <div className="grid items-center gap-8 overflow-hidden rounded-media bg-accent p-6 text-accent-ink sm:p-10 md:grid-cols-[1.1fr_1fr] md:gap-12 lg:p-16">
          <div className="animate-[ri-sheet-in_var(--ri-slow)_var(--ri-ease)] space-y-6">
            <h1 className="display text-4xl lg:text-5xl">{banner ? pick(banner.title, locale) : t("heroTitle")}</h1>
            <p className="max-w-[52ch] text-lg text-accent-ink/75">{banner ? pick(banner.subtitle, locale) : t("heroSubtitle")}</p>
            <div className="flex flex-wrap gap-3">
              {banner?.cta_href && banner.cta_label ? (
                <Button asChild size="lg" variant="inverse">
                  <a href={banner.cta_href}>{pick(banner.cta_label, locale)}</a>
                </Button>
              ) : (
                <Button asChild size="lg" variant="inverse">
                  <Link href="/find-your-ink">
                    {t("heroFind")}
                    <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="secondary" className="border-accent-ink text-accent-ink">
                <Link href="/search">{t("heroBrowse")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-media sm:max-w-xs md:max-w-md">
            {bannerImage ? (
              <Image src={bannerImage} alt="" fill priority sizes="(min-width: 768px) 40vw, 90vw" className="object-cover" />
            ) : (
              <HeroArt className="size-full" />
            )}
          </div>
        </div>
      </section>

      <section aria-label="ROYAL INK" className="container-ri">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-6 border-b border-line py-8 md:grid-cols-4">
          {[
            { icon: Banknote, title: tt("cod"), text: tt("codText") },
            { icon: Truck, title: tt("wilayas"), text: tt("wilayasText") },
            { icon: ShieldCheck, title: tt("origin"), text: tt("originText") },
            { icon: BadgeCheck, title: tt("verified"), text: tt("verifiedText") },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-ink-2">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Section aria-labelledby="find">
        <SectionHeader id="find" title={t("findTitle")} subtitle={t("findSubtitle")} />
        <div className="rounded-card border border-line p-5 sm:p-8">
          <FindYourInk brands={printerBrands} />
        </div>
      </Section>

      {tree.length > 0 ? (
        <Section aria-labelledby="categories">
          <SectionHeader id="categories" title={t("categories")} />
          <ul className="grid gap-4 md:grid-cols-3">
            {tree.map((c) => (
              <li key={c.id} className="rounded-card bg-surface p-6">
                <Link href={`/c/${c.slug}`} className="group inline-flex items-center gap-2 text-lg font-semibold">
                  <Folder className="size-5 text-ink-2" aria-hidden />
                  {pick(c.name, locale)}
                  <ArrowRight className="size-4 transition-ri group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </Link>
                {c.children.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {c.children.map((s) => (
                      <li key={s.id}>
                        <Link href={`/c/${s.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-line bg-bg px-3 text-sm hover:border-ink">
                          {pick(s.name, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {featured.length > 0 ? (
        <Section aria-labelledby="featured">
          <SectionHeader id="featured" title={t("featured")} />
          <ProductGrid products={featured} />
        </Section>
      ) : null}

      {newest.items.length > 0 ? (
        <Section aria-labelledby="new">
          <SectionHeader id="new" title={t("newArrivals")} href="/search?sort=newest" linkLabel={tc("viewAll")} />
          <ProductGrid products={newest.items} />
        </Section>
      ) : (
        <Section>
          <p className="rounded-card border border-dashed border-line p-8 text-center text-ink-2">{t("emptyCatalog")}</p>
        </Section>
      )}

      {collections.length > 0 ? (
        <Section aria-labelledby="collections">
          <SectionHeader id="collections" title={t("collections")} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => {
              const img = publicStorageUrl("banners", c.image_path);
              return (
                <li key={c.id}>
                  <Link href={`/collections/${c.slug}`} className="group block overflow-hidden rounded-card border border-line">
                    <div className="relative aspect-[16/9] bg-surface">
                      {img ? <Image src={img} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover transition-ri group-hover:scale-[1.02]" /> : null}
                    </div>
                    <div className="p-4">
                      <p className="font-semibold">{pick(c.title, locale)}</p>
                      {c.description ? <p className="line-clamp-2 text-sm text-ink-2">{pick(c.description, locale)}</p> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {brands.length > 0 ? (
        <Section aria-labelledby="brands">
          <SectionHeader id="brands" title={t("brands")} href="/brands" linkLabel={tc("viewAll")} />
          <ul className="flex flex-wrap gap-3">
            {brands.map((b) => (
              <li key={b.id}>
                <Link href={`/brands/${b.slug}`} className="inline-flex min-h-12 items-center rounded-full border border-line px-5 text-sm font-semibold hover:border-ink">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

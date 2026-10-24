import { useLocale, useTranslations } from "next-intl";
import type { ProductCardData } from "@/features/catalog/types";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatInteger } from "@/lib/format";
import { pick } from "@/lib/localized";
import { Availability } from "./availability";
import { AddToCartCompact } from "./cart/add-to-cart";
import { OriginBadge } from "./origin-badge";
import { Price } from "./price";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("product");
  const name = pick(product.name, locale);
  const capacity =
    product.page_yield ? t("yield", { pages: formatInteger(product.page_yield) })
    : product.volume_ml ? t("volume", { ml: formatInteger(product.volume_ml) })
    : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-bg transition-shadow duration-[var(--ri-fast)] hover:shadow-1">
      <div className="relative">
        <ProductImage
          path={product.image_path}
          alt={name}
          type={product.product_type}
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
          priority={priority}
          noImageLabel={t("noImage")}
          className="transition-ri group-hover:[&_img]:scale-[1.03] [&_img]:transition-ri"
        />
        {product.in_stock ? <AddToCartCompact productId={product.id} name={name} className="absolute bottom-3 end-3" /> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="flex items-center gap-1.5 truncate text-xs text-ink-2">
          {product.brand_name ? <span className="font-medium text-ink">{product.brand_name}</span> : null}
          {product.brand_name && product.model_code ? <span aria-hidden>·</span> : null}
          {product.model_code ? <span className="code">{product.model_code}</span> : null}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link href={`/p/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {name}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <OriginBadge origin={product.origin} />
          {capacity ? <span className="text-xs text-ink-2">{capacity}</span> : null}
        </div>
        <div className="mt-auto flex flex-col gap-1 pt-1">
          <Price price={product.price_dzd} compareAt={product.compare_at_dzd} locale={locale} />
          <Availability inStock={product.in_stock} lowStock={product.low_stock} />
        </div>
      </div>
      {/* Keyboard focus ring for the stretched link. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card ring-accent group-has-[a:focus-visible]:ring-2" />
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="w-full [&>article]:h-full">
            <ProductCard product={p} priority={i < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}

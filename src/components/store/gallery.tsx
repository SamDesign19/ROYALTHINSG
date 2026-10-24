"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ProductType } from "@/features/catalog/types";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";

type GalleryImage = { src: string; alt: string };

export function Gallery({
  images,
  fallbackAlt,
  type,
}: {
  images: GalleryImage[];
  fallbackAlt: string;
  type: ProductType;
}) {
  const t = useTranslations("product");
  const [index, setIndex] = useState(0);
  const current = images[index];
  if (!current) {
    return <ProductImage path={null} alt={fallbackAlt} type={type} sizes="50vw" noImageLabel={t("noImage")} className="rounded-media" />;
  }
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-media bg-surface">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 600px, 100vw"
          className="animate-[ri-fade-in_var(--ri-base)_var(--ri-ease)] object-contain p-[6%]"
        />
        <span className="sr-only" aria-live="polite">{t("image", { index: index + 1, count: images.length })}</span>
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <li key={img.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("showImage", { index: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-control border-2 bg-surface sm:size-20",
                  i === index ? "border-ink" : "border-transparent hover:border-line",
                )}
              >
                <Image src={img.src} alt="" fill sizes="80px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

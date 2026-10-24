import Image from "next/image";
import { Droplet, Package, Printer, Sparkles, StickyNote, Wrench } from "lucide-react";
import type { ProductType } from "@/features/catalog/types";
import { publicStorageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<ProductType, typeof Droplet>> = {
  ink_bottle: Droplet,
  ink_cartridge: Droplet,
  toner: Package,
  drum: Package,
  printer: Printer,
  printer_part: Wrench,
  maintenance_box: Wrench,
  paper: StickyNote,
  label: StickyNote,
  cleaning: Sparkles,
};

/** Square product image on the surface colour; a neutral type icon when no photo has been uploaded. */
export function ProductImage({
  path,
  alt,
  type,
  sizes,
  priority,
  noImageLabel,
  className,
}: {
  path: string | null;
  alt: string;
  type: ProductType;
  sizes: string;
  priority?: boolean;
  noImageLabel: string;
  className?: string;
}) {
  const src = publicStorageUrl("product-images", path);
  const Icon = ICONS[type] ?? Package;
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-surface", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain p-[8%]" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-ink-2/60" role="img" aria-label={`${alt} — ${noImageLabel}`}>
          <Icon className="size-1/4 stroke-[1.25]" aria-hidden />
        </div>
      )}
    </div>
  );
}

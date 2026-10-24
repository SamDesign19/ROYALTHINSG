import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { brandOptions, categoryOptions } from "@/features/admin/queries";
import { requireStaff } from "@/server/auth";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  await requireStaff();
  const [categories, brands] = await Promise.all([categoryOptions(), brandOptions()]);
  return (
    <>
      <PageHeader title="Nouveau produit" description="Créé en brouillon par défaut. Le stock, les paliers de prix et la compatibilité se règlent après la création." />
      <ProductForm product={null} categories={categories} brands={brands} />
    </>
  );
}

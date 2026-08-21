import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm, type AdminProductInitial } from "./ProductForm";
import { VariantManager } from "./VariantManager";

export default async function AdminProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
    },
  });

  if (!product) {
    notFound();
  }

  const initial: AdminProductInitial = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    sku: product.sku,
    category: product.category,
    imageUrl: product.images[0] ?? "",
    images: product.images,
    featured: product.featured,
    isNew: product.isNew,
    inStock: product.inStock,
    status: product.status,
    tags: product.tags,
  };

  return (
    <main className="min-h-screen bg-black px-6 py-6 text-white">
      <ProductForm product={initial} />
      <VariantManager
        productId={product.id}
        initialVariants={product.variants.map((v) => ({
          id: v.id,
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          stock: v.stock,
          available: v.available,
        }))}
      />
    </main>
  );
}



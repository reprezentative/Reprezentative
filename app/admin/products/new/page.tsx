import { ProductForm, type AdminProductInitial } from "../[id]/ProductForm";

export default function AdminProductCreatePage({
  searchParams,
}: {
  searchParams: { image?: string };
}) {
  const initial: AdminProductInitial = {
    name: "",
    slug: "",
    description: "",
    price: 0,
    sku: "",
    category: "",
    imageUrl: searchParams?.image ?? "",
    featured: false,
    isNew: true,
    inStock: true,
  };

  return (
    <main className="min-h-screen bg-black px-6 py-6 text-white">
      <ProductForm product={initial} mode="create" />
    </main>
  );
}



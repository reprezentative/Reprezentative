import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CogsForm } from "./CogsForm";

export default async function ProductCogsPage({
  params,
}: {
  params: { productId: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
  });

  if (!product) {
    notFound();
  }

  // Pre-fill with the most recent cost structure so editing works as expected.
  const latestCogs = await prisma.productCOGS.findFirst({
    where: { productId: product.id },
    orderBy: { effectiveDate: "desc" },
  });

  return (
    <main className="min-h-screen bg-black px-6 py-6 text-white">
      <CogsForm
        productId={product.id}
        productName={product.name}
        initial={latestCogs}
      />
    </main>
  );
}




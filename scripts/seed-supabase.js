// Seeds a clean database: one ADMIN account + the exported product catalog
// (products, variants, COGS). Idempotent — safe to re-run.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  // 1) Admin user (login: admin@reprezentative.com / Admin123!)
  const password = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@reprezentative.com" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@reprezentative.com",
      password,
      role: "ADMIN",
      name: "Admin",
    },
  });
  console.log("Admin ready:", admin.email);

  // 2) Catalog import
  const file = path.join(process.cwd(), "scripts", "catalog-export.json");
  if (!fs.existsSync(file)) {
    console.log("No catalog-export.json found — skipping catalog seed.");
    return;
  }
  const catalog = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const p of catalog) {
    const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (exists) {
      console.log("Skip (exists):", p.name);
      continue;
    }

    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        sku: p.sku,
        material: p.material ?? "",
        fit: p.fit,
        category: p.category,
        images: p.images ?? [],
        colors: p.colors ?? [],
        sizes: p.sizes ?? [],
        featured: !!p.featured,
        isNew: !!p.isNew,
        inStock: p.inStock !== false,
        metaTitle: p.metaTitle ?? null,
        metaDescription: p.metaDescription ?? null,
        keywords: p.keywords ?? [],
      },
    });

    for (const v of p.variants ?? []) {
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          stock: v.stock,
          reserved: v.reserved ?? 0,
          available: v.available ?? v.stock,
          restockThreshold: v.restockThreshold ?? 10,
          sku: v.sku,
          discontinued: !!v.discontinued,
        },
      });
    }

    for (const c of p.cogs ?? []) {
      const { id, productId, createdAt, updatedAt, effectiveDate, ...rest } = c;
      await prisma.productCOGS.create({
        data: {
          ...rest,
          productId: created.id,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        },
      });
    }

    console.log(
      "Created:",
      p.name,
      `(${(p.variants ?? []).length} variants, ${(p.cogs ?? []).length} cogs)`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

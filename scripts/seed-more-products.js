// Adds a few more demo products (idempotent by slug). Images are left empty so
// the storefront shows a neutral placeholder until you upload real images.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SW = ["S", "M", "L", "XL"];
const hex = "#1f1f1f";

const PRODUCTS = [
  {
    name: "Box Logo Crewneck",
    slug: "box-logo-crewneck",
    sku: "RZ-CREW-BOXLOGO",
    price: 110,
    category: "Sweatshirts",
    fit: "REGULAR",
    material: "380 gsm loopback cotton",
    description:
      "A heavyweight crewneck with the wordmark boxed across the chest. Garment-dyed for a lived-in tone.",
    metaDescription: "Heavyweight garment-dyed crewneck with a boxed wordmark.",
    sizes: SW,
    stock: 25,
    cogs: { fabricCost: 9, laborCost: 6, freightCost: 3, warehousingCost: 2 },
  },
  {
    name: "Cargo Sweatpant",
    slug: "cargo-sweatpant",
    sku: "RZ-PANT-CARGO",
    price: 95,
    category: "Bottoms",
    fit: "REGULAR",
    material: "360 gsm brushed fleece",
    description:
      "Relaxed fleece sweatpant with bellowed cargo pockets and a tapered ankle. Cut from the same fleece as the hoodies.",
    metaDescription: "Relaxed brushed-fleece cargo sweatpant, tapered ankle.",
    sizes: SW,
    stock: 25,
    cogs: { fabricCost: 8, laborCost: 7, freightCost: 3, warehousingCost: 2 },
  },
  {
    name: "5-Panel Cap",
    slug: "5-panel-cap",
    sku: "RZ-CAP-5PANEL",
    price: 45,
    category: "Accessories",
    fit: "REGULAR",
    material: "Cotton twill",
    description:
      "A structured 5-panel cap in cotton twill with a woven wordmark tab. One size, adjustable strap.",
    metaDescription: "Structured cotton-twill 5-panel cap with a woven tab.",
    sizes: ["One Size"],
    stock: 40,
    cogs: { fabricCost: 3, laborCost: 3, freightCost: 1, warehousingCost: 1 },
  },
];

async function main() {
  for (const p of PRODUCTS) {
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) {
      console.log("Skip (exists):", p.name);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        sku: p.sku,
        material: p.material,
        fit: p.fit,
        category: p.category,
        images: [],
        colors: [{ name: "Black", hex, available: true }],
        sizes: p.sizes.map((s) => ({ name: s, available: true })),
        featured: false,
        isNew: true,
        inStock: true,
        metaDescription: p.metaDescription,
        keywords: [],
      },
    });
    for (const s of p.sizes) {
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          color: "Black",
          colorHex: hex,
          size: s,
          stock: p.stock,
          reserved: 0,
          available: p.stock,
          sku: `${p.sku}-${s.replace(/\s+/g, "").toUpperCase()}`,
        },
      });
    }
    const c = p.cogs;
    const totalCOGS =
      c.fabricCost + c.laborCost + c.freightCost + c.warehousingCost;
    await prisma.productCOGS.create({
      data: {
        productId: created.id,
        fabricCost: c.fabricCost,
        fabricYards: 0,
        trimsCost: 0,
        packagingCost: 0,
        laborCost: c.laborCost,
        patternCost: 0,
        gradingCost: 0,
        sampleCost: 0,
        printingCost: 0,
        qcCost: 0,
        freightCost: c.freightCost,
        dutiesCost: 0,
        brokerageCost: 0,
        domesticShipping: 0,
        warehousingCost: c.warehousingCost,
        handlingCost: 0,
        shrinkageRate: 0,
        totalCOGS,
        effectiveDate: new Date(),
        notes: "Seed COGS",
      },
    });
    console.log("Created:", p.name, `(${p.sizes.length} variants)`);
  }
  const total = await prisma.product.count();
  console.log("Total products now:", total);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

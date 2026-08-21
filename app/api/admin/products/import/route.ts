import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

// Minimal RFC-4180-ish CSV parser (handles quoted fields, commas, newlines).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const csv = (body?.csv ?? "").toString();
    if (!csv.trim()) {
      return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV needs a header row and at least one data row." },
        { status: 400 },
      );
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    const idx = {
      name: col("name"),
      price: col("price"),
      sku: col("sku"),
      category: col("category"),
      description: col("description"),
      image: col("image"),
      status: col("status"),
      tags: col("tags"),
      sizes: col("sizes"),
    };
    if (idx.name === -1) {
      return NextResponse.json(
        { error: 'CSV must include a "name" column.' },
        { status: 400 },
      );
    }

    const VALID_STATUS = ["DRAFT", "ACTIVE", "ARCHIVED"];
    let created = 0;
    const skipped: string[] = [];
    const errors: string[] = [];

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : "");
      const name = get(idx.name);
      if (!name) continue;

      try {
        let slug = slugify(name);
        let sku = get(idx.sku) || `${slug}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

        if (await prisma.product.findUnique({ where: { slug } })) {
          slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
        }
        if (await prisma.product.findUnique({ where: { sku } })) {
          skipped.push(`${name} (SKU ${sku} exists)`);
          continue;
        }

        const price = Number(get(idx.price)) || 0;
        const category = get(idx.category) || "Uncategorized";
        const description = get(idx.description) || name;
        const image = get(idx.image);
        const statusRaw = get(idx.status).toUpperCase();
        const status = VALID_STATUS.includes(statusRaw) ? statusRaw : "ACTIVE";
        const tags = get(idx.tags)
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean);
        // sizes: "S:10|M:20|L:15"
        const sizeSpecs = get(idx.sizes)
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            const [sz, st] = s.split(":");
            return { size: (sz || "").trim(), stock: Math.max(0, Math.floor(Number(st) || 0)) };
          })
          .filter((s) => s.size);

        await prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              name,
              slug,
              description,
              price,
              sku,
              material: "",
              fit: "REGULAR",
              category,
              images: image ? [image] : [],
              colors: [{ name: "Default", hex: "#000000", available: true }] as any,
              sizes: (sizeSpecs.length ? sizeSpecs.map((s) => ({ name: s.size, available: true })) : [{ name: "One Size", available: true }]) as any,
              featured: false,
              isNew: true,
              inStock: true,
              status: status as any,
              tags,
            },
          });

          const variants = sizeSpecs.length
            ? sizeSpecs
            : [{ size: "One Size", stock: 0 }];
          for (const v of variants) {
            await tx.productVariant.create({
              data: {
                productId: product.id,
                color: "Default",
                colorHex: "#000000",
                size: v.size,
                stock: v.stock,
                reserved: 0,
                available: v.stock,
                sku: `${sku}-${v.size.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "OS"}`,
              },
            });
          }
        });

        created++;
      } catch (e: any) {
        errors.push(`${name}: ${e?.message?.slice(0, 80) || "failed"}`);
      }
    }

    return NextResponse.json(
      { created, skipped, errors, total: rows.length - 1 },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Product import error:", error);
    }
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin, PRODUCT_IMAGE_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lists every image in the storage bucket (recursively) with public URLs.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing).", images: [] },
      { status: 200 },
    );
  }

  const bucket = supabaseAdmin.storage.from(PRODUCT_IMAGE_BUCKET);

  type Img = { path: string; url: string; name: string; size: number; updatedAt: string | null };
  const images: Img[] = [];

  async function walk(prefix: string) {
    const { data, error } = await bucket.list(prefix, {
      limit: 1000,
      sortBy: { column: "updated_at", order: "desc" },
    });
    if (error || !data) return;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await walk(path); // folder
      } else {
        images.push({
          path,
          url: bucket.getPublicUrl(path).data.publicUrl,
          name: item.name,
          size: (item as any).metadata?.size ?? 0,
          updatedAt: (item as any).updated_at ?? null,
        });
      }
    }
  }

  try {
    await walk("");
    images.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return NextResponse.json({ images }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Media list error:", error);
    }
    return NextResponse.json({ error: "Failed to list media", images: [] }, { status: 500 });
  }
}

// Deletes one image by its storage path.
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const path = (body?.path ?? "").trim();
    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([path]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Media delete error:", error);
    }
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}

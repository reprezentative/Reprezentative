import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin, PRODUCT_IMAGE_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Admin-only image upload -> Supabase Storage, returns a public URL.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        error:
          "Image uploads are not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid upload — expected multipart form data with a file." },
      { status: 400 },
    );
  }

  try {
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5 MB or smaller" },
        { status: 400 },
      );
    }

    const ext =
      (file.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `products/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(key, bytes, { contentType: file.type, upsert: false });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Supabase upload error:", error.message);
      }
      return NextResponse.json(
        { error: "Upload failed: " + error.message },
        { status: 500 },
      );
    }

    const { data } = supabaseAdmin.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(key);

    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Upload route error:", error);
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

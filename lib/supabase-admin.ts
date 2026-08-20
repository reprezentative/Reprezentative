import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service_role key. NEVER import this
// into client components — the service_role key bypasses row-level security.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Defaults to "product-images"; override with SUPABASE_STORAGE_BUCKET if you
// named your bucket something else.
export const PRODUCT_IMAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "product-images";

export const supabaseAdmin =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

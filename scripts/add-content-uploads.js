// Inserts a <MediaUpload> button after each media/image input in the Content
// Manager. Idempotent-ish: aborts if a button already appears to be present.
const fs = require("fs");
const FILE = "app/admin/content/page.tsx";
let src = fs.readFileSync(FILE, "utf8");

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// section media inputs -> applyMedia(...)
const sections = [
  ['value={hero?.videoUrl ?? ""}', 'applyMedia("hero", url)'],
  ['value={hero2?.videoUrl ?? hero2?.imageUrl ?? ""}', 'applyMedia("hero_2", url)'],
  ['value={promoLeft?.videoUrl ?? promoLeft?.imageUrl ?? ""}', 'applyMedia("promo_left", url)'],
  ['value={promoRight?.videoUrl ?? promoRight?.imageUrl ?? ""}', 'applyMedia("promo_right", url)'],
  ['value={featured?.videoUrl ?? featured?.imageUrl ?? ""}', 'applyMedia("featured_split", url)'],
  ['value={banner?.videoUrl ?? banner?.imageUrl ?? ""}', 'applyMedia("full_width_banner", url)'],
];

let inserted = 0;

for (const [valueExpr, cb] of sections) {
  const re = new RegExp("(" + esc(valueExpr) + "[\\s\\S]*?/>)");
  const btn = `\n                  <MediaUpload onUploaded={(url) => ${cb}} />`;
  if (!re.test(src)) {
    console.warn("WARN: not found ->", valueExpr);
    continue;
  }
  src = src.replace(re, (m) => m + btn);
  inserted++;
}

// three_columns per-column image input
const colRe = new RegExp('(value=\\{col\\.imageUrl \\?\\? ""\\}[\\s\\S]*?/>)');
if (colRe.test(src)) {
  src = src.replace(
    colRe,
    (m) =>
      m +
      '\n                        <MediaUpload onUploaded={(url) => handleColumnChange(i, "imageUrl", url)} label="Upload" />',
  );
  inserted++;
} else {
  console.warn("WARN: three_columns image input not found");
}

fs.writeFileSync(FILE, src, "utf8");
console.log("Inserted", inserted, "MediaUpload buttons.");
console.log("Total <MediaUpload occurrences:", (src.match(/<MediaUpload/g) || []).length);

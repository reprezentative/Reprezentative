// Adds promo-code + gift-card inputs to the /store checkout and includes them
// in the checkout POST body. Idempotent-ish (skips if already present).
const fs = require("fs");
const FILE = "lib/store-template.html";
let src = fs.readFileSync(FILE, "utf8");

if (src.includes("id=\\\"promo\\\"") || src.includes('id="promo"')) {
  console.log("Already patched.");
  process.exit(0);
}

// 1) Add coupon/gift fields to the payload (after the items line).
const itemsLine =
  "items: cart.map(function(c){ return { id:c.id, size:c.size, qty:c.qty }; })";
if (!src.includes(itemsLine)) throw new Error("payload items line not found");
src = src.replace(
  itemsLine,
  itemsLine +
    ",\n      couponCode: (document.getElementById('promo')||{}).value ? document.getElementById('promo').value.trim() : ''," +
    "\n      giftCardCode: (document.getElementById('giftcard')||{}).value ? document.getElementById('giftcard').value.trim() : ''",
);

// 2) Add the fields to the checkout form, before the "Place order" button.
const btnAnchor = "'<button class=\"btn wide\" type=\"submit\">Place order";
if (!src.includes(btnAnchor)) throw new Error("place order button not found");
const fieldset =
  "'<fieldset><legend>Promo &amp; gift card</legend><div class=\"fields\">'+" +
  "'<div class=\"f full\"><label for=\"promo\">Promo code</label><input id=\"promo\" placeholder=\"Optional\"></div>'+" +
  "'<div class=\"f full\"><label for=\"giftcard\">Gift card</label><input id=\"giftcard\" placeholder=\"Optional\"></div>'+" +
  "'</div></fieldset>'+";
src = src.replace(btnAnchor, fieldset + btnAnchor);

fs.writeFileSync(FILE, src, "utf8");
console.log("Patched checkout with promo + gift card fields.");

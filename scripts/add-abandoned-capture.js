// Captures the shopper's email + cart for abandoned-cart recovery when they
// type an email at checkout (fires on the email field's blur).
const fs = require("fs");
const FILE = "lib/store-template.html";
let src = fs.readFileSync(FILE, "utf8");

if (src.includes("/api/store/abandoned-cart")) {
  console.log("Already patched.");
  process.exit(0);
}

// The router calls route() then wires page-specific handlers. We attach a
// delegated blur listener once, globally, on the email input.
const anchor = "window.addEventListener('hashchange', route);";
if (!src.includes(anchor)) throw new Error("router anchor not found");

const snippet = `document.addEventListener('blur', function(e){
  var el = e.target;
  if(!el || el.id!=='email') return;
  var email = (el.value||'').trim();
  if(!email || email.indexOf('@')<0 || !cart.length) return;
  try{
    fetch('/api/store/abandoned-cart', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ email: email, subtotal: subtotal(),
        items: cart.map(function(c){return {id:c.id,name:c.name,size:c.size,qty:c.qty,price:c.price,image:c.img};}) })});
  }catch(_){}
}, true);
`;

src = src.replace(anchor, snippet + anchor);
fs.writeFileSync(FILE, src, "utf8");
console.log("Patched storefront with abandoned-cart capture.");

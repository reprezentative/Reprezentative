// One-off transform: turns the hardcoded demo HTML into a data-driven template.
// - Replaces the hardcoded PRODUCTS array with a __PRODUCTS__ placeholder
//   (the /store route handler injects live DB products at request time).
// - Makes the product size grid iterate the product's own sizes.
// - Replaces the fake in-memory checkout with a real POST to /api/store/checkout.
const fs = require("fs");
const path = require("path");

const SRC = "C:/Users/beltr/Downloads/reprezentative-store (1).html";
const OUT = path.join(process.cwd(), "lib", "store-template.html");

let html = fs.readFileSync(SRC, "utf8");

// 1) PRODUCTS array -> placeholder
const before1 = html.length;
html = html.replace(
  /var PRODUCTS = \[[\s\S]*?\n\];\nvar SIZES/,
  "var PRODUCTS = __PRODUCTS__;\nvar SIZES",
);
if (html.length === before1) throw new Error("PRODUCTS array not replaced");

// 2) Dynamic size grid
const sizeOld =
  "  for(var i=0;i<SIZES.length;i++){\n" +
  "    var s=SIZES[i], left=p.sizes[s];\n" +
  "    szh+='<button class=\"sz\" data-size=\"'+s+'\" aria-pressed=\"false\"'+(left?'':' disabled')+'>'+s+'</button>';\n" +
  "  }";
const sizeNew =
  "  var _skeys=Object.keys(p.sizes||{});\n" +
  "  for(var i=0;i<_skeys.length;i++){\n" +
  "    var s=_skeys[i], left=p.sizes[s];\n" +
  "    szh+='<button class=\"sz\" data-size=\"'+s+'\" aria-pressed=\"false\"'+(left?'':' disabled')+'>'+s+'</button>';\n" +
  "  }";
if (!html.includes(sizeOld)) throw new Error("size loop not found");
html = html.replace(sizeOld, sizeNew);

// 3) Real checkout POST
const coOld =
  "    order = {\n" +
  "      id: 'RPZ-'+String(Math.floor(100000+Math.random()*899999)),\n" +
  "      email: document.getElementById('email').value.trim(),\n" +
  "      items: cart.slice(),\n" +
  "      total: subtotal()+shipCost()\n" +
  "    };\n" +
  "    cart = [];\n" +
  "    location.hash='#/done';";
const coNew = [
  "    var _email = document.getElementById('email').value.trim();",
  "    var _snapshot = cart.slice();",
  "    var _localTotal = subtotal()+shipCost();",
  "    var _payload = {",
  "      email: _email,",
  "      firstName: document.getElementById('fn').value.trim(),",
  "      lastName: document.getElementById('ln').value.trim(),",
  "      address: document.getElementById('a1').value.trim(),",
  "      city: document.getElementById('city').value.trim(),",
  "      zip: document.getElementById('zip').value.trim(),",
  "      country: document.getElementById('country').value,",
  "      items: cart.map(function(c){ return { id:c.id, size:c.size, qty:c.qty }; })",
  "    };",
  "    var _btn = document.querySelector('#cof button[type=submit]');",
  "    if(_btn){ _btn.disabled = true; _btn.textContent = 'Placing order\\u2026'; }",
  "    fetch('/api/store/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(_payload) })",
  "      .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, j:j }; }); })",
  "      .then(function(res){",
  "        if(!res.ok){ if(_btn){ _btn.disabled=false; } toast(res.j && res.j.error ? res.j.error : 'Checkout failed'); return; }",
  "        order = { id: res.j.orderNumber, email: _email, items: _snapshot, total: (res.j.total!=null? res.j.total : _localTotal) };",
  "        cart = []; syncBag();",
  "        location.hash='#/done';",
  "      })",
  "      .catch(function(){ if(_btn){ _btn.disabled=false; } toast('Checkout failed. Please try again.'); });",
].join("\n");
if (!html.includes(coOld)) throw new Error("checkout block not found");
html = html.replace(coOld, coNew);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
console.log("Wrote", OUT, "(" + html.length + " bytes)");
console.log("Has placeholder:", html.includes("__PRODUCTS__"));

## Reprezentative E‑Commerce Platform – Scope of Work & Phased Plan

### Project Overview
- **Goal**: Build a production-grade, luxury e‑commerce and business intelligence platform for Reprezentative, covering storefront, customer accounts, admin back office, finance hub, operations hub, and AI insights.
- **Tech Stack**: Next.js 14+ (App Router), TypeScript, PostgreSQL + Prisma, Tailwind CSS, NextAuth, Stripe, AWS S3, SendGrid, TaxJar, SmartyStreets, DeepSeek (`deepseek-chat`) for all AI.
- **Non‑Negotiable Rules**:
  - **Zero hardcoded data** – all UI content and entities come from the database.
  - **Zero mock data** – use proper DB records and seeding scripts, never in‑component arrays.
  - **100% CMS control** – all public content editable via Admin Content Manager (`Content` table).
  - **DeepSeek only** – all AI features use the DeepSeek API, not OpenAI or others.
  - **Real‑time inventory** – stock, reserved, available, and history managed in DB with transactions.

### Quick Reference for New Chat Sessions
- **Project Path**: `C:\Users\beltr\Reprezentative.v.11262025`
- **Current Status**: Phases 0-12 are complete. All core features implemented including storefront, admin dashboard, finance hub, operations hub, AI assistant, and UX polish features.
- **Recent Work**: Phase 12 completed with system reset, help modals, AI chat history, demo data seeding, API tracking, product management, number formatting, and homepage layout customization.
- **Key Files**:
  - `app/page.tsx` - Homepage with Editorial/Drop Feed layout support
  - `app/admin/content/page.tsx` - Content Manager with live preview
  - `app/admin/ai-assistant/page.tsx` - AI Assistant with chat history
  - `app/admin/settings/page.tsx` - System settings with reset tool
  - `lib/format.ts` - Number and currency formatting utilities
  - `components/AdminPageHelp.tsx` - Reusable help modal component
- **Environment**: Running `npm run dev` on `http://localhost:3345`
- **Database**: Prisma with PostgreSQL, migrations in `prisma/migrations/`

---

## Phase 0 – Foundation & Environment (Week 0–1)
- **Environment & Repo**
  - **Set up** Next.js 14+ app with TypeScript, Tailwind, App Router structure.
  - **Configure** base project structure (`app/`, `components/`, `lib/`, `prisma/`) per `DEVELOPER_GUIDE_COMPLETE.md`.
  - **Add** core dependencies (Prisma, NextAuth, Stripe, DeepSeek client, SendGrid, AWS SDK, Zod, RHF).
- **Database & Prisma**
  - **Copy** schema from `DATABASE_SCHEMA.md` into `prisma/schema.prisma`.
  - **Run** initial migrations and implement `prisma/seed.ts` based on provided seed example.
  - **Verify** key tables: `User`, `Product`, `ProductVariant`, `CartItem`, `Order`, `Content`, `StockHistory`, `Coupon`, `Campaign`, `AIChatMessage`, `Setting`, plus finance/ops tables from `COMPLETE_FEATURE_GUIDE.md`.
- **Infrastructure Glue**
  - **Implement** shared clients in `lib/` (`prisma`, `deepseek`, `stripe`, `s3`, `sendgrid`).
  - **Configure** environment variables and `.env.local` template.

**Exit Criteria**: DB migrations and seeding run cleanly; basic Next.js app boots; shared libs compile; no hardcoded or mock data in any new code.

---

## Phase 1 – Public Storefront (Core E‑Commerce) (Week 1–3)
- **Routing & Layout**
  - **Implement** public layout with navigation, footer, and responsive grid system using Tailwind.
  - **Wire** navigation and footer to `Content` table via `/api/content/*` routes.
- **Homepage (`01-homepage.html`)**
  - **Build** all sections (hero, featured split, banner, three‑column grid, editorial, newsletter, footer) pulling data from `Content` keys as defined in `PROJECT_SCOPE.md`.
  - **Ensure** SSR, image optimization, and responsive behavior at 768px/1024px breakpoints.
- **Shop / Collection Page (`03-shop-page.html`)**
  - **Implement** `/shop` page with products grid driven by `/api/products` and `/api/products/filters`.
  - **Support** filters (category, color, size, price range) and sorting; keep URL‑synced query params.
  - **Handle** loading, empty‑state, and error UI.
- **Product Detail Page (`02-product-detail.html`)**
  - **Implement** dynamic route `/product/[slug]` wired to `/api/products/[slug]`, `/api/reviews`, and `/api/products/related`.
  - **Add** gallery, color/size selection, quantity selector, and actions (Add to Cart, Add to Wishlist).
  - **Include** SEO meta, schema.org Product markup, breadcrumbs, and 404 behavior.

**Exit Criteria**: All public pages read exclusively from DB; filters and product detail flows work end‑to‑end (up to but not including checkout payment); content is fully admin‑overridable via `Content` records.

---

## Phase 2 – Cart, Checkout & User Accounts (Week 3–5)
- **Authentication & Account Shell**
  - **Configure** NextAuth with `User` table and roles; protect `/account/*`, `/checkout`, and sensitive APIs.
  - **Create** `/account` layout and tabs (Orders, Wishlist, Profile, Addresses, Payment Methods, Settings).
- **Cart & Coupons (`04-cart.html`)**
  - **Implement** cart API (`/api/cart`, `/api/cart/add`, `/api/cart/update`, `/api/cart/remove`, `/api/cart/apply-coupon`).
  - **Build** cart page with live quantity edits, coupon logic, shipping thresholds, and real‑time stock validation.
- **Checkout Flow**
  - **Implement** `/checkout` with multi‑section form (shipping, billing, shipping method, payment).
  - **Integrate** Stripe Payment Element and payment intent workflow plus TaxJar and SmartyStreets.
  - **Create** `/api/checkout/create-intent`, `/api/checkout/confirm`, and tie into `Order`/`OrderItem` creation and stock decrement.
  - **Send** order confirmation emails via SendGrid.
- **User Dashboard Pages (`05-user-dashboard.html`)**
  - **Implement** Orders, Wishlist, Profile, Addresses, Payment Methods, and Settings tabs as per `PROJECT_SCOPE.md`.
  - **Wire** all tabs to their respective APIs (`/api/user/orders`, `/api/user/wishlist`, `/api/user/addresses`, etc.).

**Exit Criteria**: Authenticated users can browse, add to cart, checkout with Stripe, receive confirmation email, and manage their account; all flows persist to DB with correct inventory updates and no hardcoded data.

---

## Phase 3 – Core Admin Hub (Products, Orders, Customers, Content, Inventory) (Week 5–8)
- **Admin Shell & Access Control**
  - **Implement** `/admin` layout and navigation (Dashboard, Products Hub, Sales Hub, Settings) using role checks.
  - **Protect** all admin routes with middleware and session role checks.
- **Admin Dashboard Overview**
  - **Add** top‑level KPIs (revenue, orders, customers, conversion, inventory value) using aggregate queries.
  - **Display** revenue trend chart, top products, and recent orders list.
- **Content Manager**
  - **Build** `/admin/content` UI mapped to all `Content.key` values (navigation, hero, banner, columns, editorial, newsletter, footer).
  - **Support** live preview, basic versioning, and safe writes via `/api/content/[key]`.
- **Product & Inventory Management**
  - **Implement** `/admin/products` list and create/edit forms, including images (S3), variants (sizes/colors), SEO, and flags.
  - **Build** Inventory Manager (`/admin/inventory`) with variant table, filters, bulk and per‑variant stock updates, and `StockHistory` logging.
- **Orders & Customers**
  - **Implement** `/admin/orders` and `/admin/orders/[id]` with status updates, tracking numbers, refunds (Stripe), and PDFs (invoice/packing slip).
  - **Implement** `/admin/customers` and `/admin/customers/[id]` with order history and basic LTV metrics.

**Exit Criteria**: Admins can fully manage products, inventory, orders, customers, and all public content from the dashboard, with accurate stock and history trails.

---

## Phase 4 – Finance Hub (COGS, Expenses, Profit Analysis, AI Pricing) (Week 8–11)
- **COGS Manager**
  - **Implement** `ProductCOGS` model and `/admin/finance/cogs` UI for materials, manufacturing, freight, and inventory costs per product.
  - **Calculate** and display true cost per item, gross margin %, and markup; log history of cost changes.
- **Expense Tracking**
  - **Implement** `Expense` table and `/admin/finance/expenses` for recurring and one‑off expenses across categories.
  - **Visualize** expenses by category, time, and as % of revenue.
- **Profit Analysis**
  - **Build** `/admin/finance/profit-analysis` with auto‑generated P&L, profitability by product/category, time‑based comparisons, and break‑even analysis.
- **AI Pricing Engine**
  - **Implement** `PricingRecommendation` and `/admin/finance/pricing` views.
  - **Integrate** DeepSeek to generate pricing scenarios and recommendations using sales + COGS + competitor inputs.

**Exit Criteria**: Finance Hub exposes accurate COGS, expenses, profit metrics, and AI pricing suggestions; all computations are derived from DB data with clear auditability.

---

## Phase 5 – Operations Hub (Suppliers, Purchase Orders, Logistics) (Week 11–14)
- **Supplier Management**
  - **Implement** `Supplier` and `SupplierProduct` models with `/admin/operations/suppliers` UI for profiles, performance metrics, and documents.
- **Purchase Orders**
  - **Implement** `PurchaseOrder` and `PurchaseOrderItem` plus `/admin/operations/purchase-orders`.
  - **Support** PO lifecycle (Draft → Sent → Confirmed → In Production → Shipped → Received), receiving workflows, and automatic inventory updates and `StockHistory` entries.
- **Logistics**
  - **Build** `/admin/operations/logistics` for inbound and outbound shipment tracking and basic warehouse views.

**Exit Criteria**: Admins can manage suppliers, create and receive POs, and track logistics; inventory integrates seamlessly with PO receipts.

---

## Phase 6 – AI Intelligence Hub & Advanced Analytics (Week 14–17)
- **AI Assistant**
  - **Implement** `/admin/ai-assistant` chat interface backed by DeepSeek and `AIChatMessage` history.
  - **Provide** specialized prompts and data pipelines for sales, inventory, finance, and marketing questions.
- **Business Insights & Analytics Enhancements**
  - **Implement** `/admin/analytics` with advanced charts (sales, product performance, customer analytics, funnels) as in `COMPLETE_FEATURE_GUIDE.md`.
  - **Add** DeepSeek‑driven insights endpoints (`/api/admin/ai/insights`, `.../inventory-insights`, `.../analytics-insights`, `.../customer-segments`, `.../campaign-suggestions`).

**Exit Criteria**: AI Assistant and insight endpoints deliver useful, structured recommendations; analytics dashboards are populated and performant.

---

## Phase 7 – Hardening, Testing & Launch (Week 17–18+)
- **Quality & Performance**
  - **Implement** comprehensive manual regression across all user and admin flows; add automated tests for critical APIs and components where feasible.
  - **Optimize** queries, N+1 hot spots, and bundle size; verify SSR performance on key pages.
- **Security & Compliance**
  - **Review** auth and authorization boundaries; ensure secrets are not leaked and webhooks are secured.
  - **Validate** payment, tax, and PII handling best practices.
- **Deployment**
  - **Prepare** production environment variables, run `prisma migrate deploy` and `db seed`, and deploy (e.g., Vercel).
  - **Smoke‑test** production: payments, emails, image uploads, AI calls, admin workflows.

**Exit Criteria**: All acceptance criteria from `PROJECT_SCOPE.md` and `FINAL_PACKAGE_*` docs are met; production deployment is stable and signed off.

---

## Phase 7 – Scripted QA Checklist (Detailed)

- **Storefront & Checkout**
  - [ ] Visit `/` and verify hero/content come from `Content` table (use Admin Content Manager to change and confirm).  
  - [ ] Browse `/shop`, apply filters (category/color/size/price), and confirm results update correctly.  
  - [ ] Open a product detail page, select size/color, and add to cart.  
  - [ ] On `/cart`, update quantities, remove items, and (if configured) apply a coupon; verify totals update.  
  - [ ] Complete checkout on `/checkout` using a Stripe test card; verify order is created, stock decremented, and confirmation shown.

- **Customer Accounts**
  - [ ] Log in via `/login` and verify access to `/account/*` but not `/admin/*`.  
  - [ ] On `/account/orders`, confirm the recent order appears with correct total and status.  
  - [ ] Test wishlist add/remove, profile update, address add/edit/delete, and settings changes.  

- **Admin – Core Hub**
  - [ ] Log in as admin and verify `/admin/*` is accessible, `/account/*` still works, and public pages remain accessible.  
  - [ ] On `/admin`, confirm KPIs, revenue trend, top products, and recent orders load without errors.  
  - [ ] Use `/admin/content` to change hero or banner text and confirm changes appear on the homepage.  
  - [ ] On `/admin/products` and `/admin/products/[id]`, verify product list and a full edit/save cycle.  
  - [ ] On `/admin/inventory`, adjust stock for a variant and confirm `ProductVariant` and `StockHistory` reflect the change.

- **Admin – Finance & Operations**
  - [ ] On `/admin/finance/cogs`, verify COGS summary and recent history load; edit a product’s COGS and confirm updates.  
  - [ ] On `/admin/finance/expenses`, create several expenses and confirm monthly and category breakdowns.  
  - [ ] On `/admin/finance/profit`, verify P&L summary and product profitability for all‑time, 30d, and YTD.  
  - [ ] On `/admin/finance/pricing`, request AI pricing recommendations for at least two products and confirm responses.  
  - [ ] On `/admin/operations/suppliers`, add a supplier and verify it appears and can be viewed on `[id]`.  
  - [ ] Create a PO on `/admin/operations/purchase-orders`, then receive items and confirm PO status, `ProductVariant.stock`, and `StockHistory` updates.  
  - [ ] On `/admin/operations/logistics`, update tracking for an order and verify changes appear.

- **AI & Analytics**
  - [ ] Visit `/admin/analytics` and confirm metrics (revenue, orders, AOV, customers) and trend bars render for each range.  
  - [ ] Use `/admin/ai-assistant` to ask at least three business questions; confirm responses are concise, numeric, and action‑oriented.

- **Launch & Deployment**
  - [ ] Verify `.env` / environment variables are complete for database, auth, Stripe, DeepSeek, email, and any third‑party services.  
  - [ ] Run `npm run build` locally and ensure it passes without errors.  
  - [ ] Deploy to staging (e.g., Vercel), run the checklist above against staging, then deploy to production and repeat the key flows as a final smoke test.

---

## Post-Launch / Phase 8 – Owner Admin UX Enhancements (Complete)

- **Owner-Friendly API Key Management**
  - [x] Add `IntegrationSecret` model with encrypted storage for per-service API keys (e.g., DeepSeek, Stripe) using a master `APP_ENCRYPTION_KEY`.  
  - [x] Implement `/api/admin/settings/keys` (GET/POST) to read “has key?” status and upsert encrypted secrets, never returning raw secrets.  
  - [x] Extend `admin/settings/api-keys` UI with “Edit key” flows so owners can paste/rotate API keys for each service directly in the dashboard (DeepSeek, Stripe, SendGrid, TaxJar, S3, SmartyStreets).  
  - [x] Update DeepSeek client to prefer decrypted DB-backed keys and fall back to environment variables; other integrations remain env-driven for now.

---

## Phase 9 – Marketing Hub (Admin Marketing Page) – Complete

- **Campaign & Content Surfaces**
  - [x] Implement `/admin/marketing` as a central hub for high-level marketing snapshots.  
  - [x] Surface key metrics from existing data (last 30 days revenue, discounted orders and their revenue share, newsletter subscriber growth).  
- **Operational Tools**
  - [ ] Add simple “Quick Campaign” creator (name, discount code link, dates, goal) tied into existing coupon / content structures.  
  - [ ] Provide links/deep-links into Content Manager for editing homepage hero/banner tied to campaigns.

**Exit Criteria**: Admins can see a marketing overview and key performance indicators from `/admin/marketing` using real Orders and Newsletter data. Future campaign-creation tools are optional stretch work.

---

## Phase 10 – SEO Tools (Admin SEO Page) – Complete

- **Global SEO Settings**
  - [ ] Expand `admin/seo` to manage site-wide meta title, description, and default Open Graph image (planned future enhancement).  
  - [ ] Wire settings into the main layout `metadata` so changes reflect on key public routes (planned).  
- **Product & Collection SEO**
  - [x] Add SEO overview table for products (missing meta title/description) with quick visibility into problem items.  
  - [x] Surface SEO coverage KPIs and a “recently updated products” list showing current meta fields.  
  - [ ] Optional: DeepSeek-assisted “Generate meta description” helper for a selected product, with human approval/edit before saving.

**Exit Criteria**: Admins can quickly see SEO coverage across the catalog and identify which products are missing titles or descriptions from `/admin/seo`; advanced global settings and AI helpers are left as stretch work.

---

## Phase 11 – System Settings (Admin Settings Page) – Complete

- **Brand & Store Configuration**
  - [x] Flesh out `admin/settings` with brand basics (store name, support email, default currency/timezone).  
  - [x] Add toggles for key features (enable/disable wishlist, AI assistant visibility).  
- **Technical & Policy Settings**
  - [ ] Provide fields for legal URLs (privacy policy, terms, returns) and contact information surfaced in the footer (planned).  
  - [x] Back these settings with a `Setting` table and lightweight API so changes are persisted and can be consumed across the app.

**Exit Criteria**: Store owners can adjust core store configuration and basic feature flags from `/admin/settings` without touching code or environment variables; deeper legal/footer integration is stretch work.

---

## Phase 12 – UX Polish, Reset Tools & Owner Experience

- **1. System Reset (Dev/QA Only)** ✅ **COMPLETE**
  - [x] Add an ADMIN-only "System Reset" action under `/admin/settings` that truncates or reseeds key tables (cart, orders, newsletter, AIChatMessage, AIChatSession, StockHistory, PurchaseOrder, Expense, ProductCOGS, etc.) for local testing.  
  - [x] Guard this behind `NODE_ENV !== "production"` and a strong confirmation modal ("Type RESET to confirm") so it cannot run in production.  
  - [x] Enhanced reset to seed a rich demo state with products, inventory, sample orders, customers, expenses, COGS, suppliers, and newsletter subscribers.

- **2. Page-Level Help ("i" Info Button)** ✅ **COMPLETE**
  - [x] Add a small "i" help icon in the header of each major admin page (Dashboard, Products, Orders, Customers, Inventory, Finance, Operations, AI Assistant, Marketing, SEO, Settings, API Keys, Content Manager).  
  - [x] Clicking opens a modal with a concise explanation of what the page is for, key metrics/actions, and any caveats (read-only vs editable).  
  - [x] Centralized copy in `components/AdminPageHelp.tsx` with `HELP_CONTENT` map so help text can be updated easily and extended later.

- **3. AI Assistant Chat History UX** ✅ **COMPLETE**
  - [x] Enhance `/admin/ai-assistant` to show a left-hand "Recent Conversations" sidebar, backed by `AIChatSession` and `AIChatMessage` grouped by session.  
  - [x] Allow "New conversation" button that starts a fresh thread while keeping old chats accessible.  
  - [x] Add date range filters ("All / Last 7 days / Last 30 days") so long histories stay manageable.  
  - [x] Clicking a session loads its messages, allowing continuation of previous conversations.

- **4. Mock / Demo Data for Storytelling** ✅ **COMPLETE**
  - [x] Enhanced system reset to insert realistic sample data: multiple products with images, customers, orders spanning several months, expenses, COGS, suppliers, POs, and newsletter subscribers.  
  - [x] Demo data drives all key dashboards (Admin overview, Finance, Operations, Analytics, Marketing, SEO) so owners immediately see how the system behaves.  
  - [x] Reset is clearly marked as dev/QA only and guarded against production execution.

- **5. API Calls & Pricing Tracking** ✅ **COMPLETE**
  - [x] Implemented `ApiCall` model for tracking external API usage (DeepSeek, Stripe, etc.).  
  - [x] Created `/admin/finance/api-calls` page displaying API usage summary and detailed breakdown by service, platform, operation, units, and estimated cost.  
  - [x] DeepSeek API calls are automatically logged with token counts and cost calculations using `DEEPSEEK_INPUT_PRICE_PER_1M_USD` and `DEEPSEEK_OUTPUT_PRICE_PER_1M_USD` environment variables.

- **6. Product Management Enhancements** ✅ **COMPLETE**
  - [x] "Add Product" button working, leading to `/admin/products/new` with functional product creation form.  
  - [x] Product edit page (`/admin/products/[id]`) with full edit capabilities.  
  - [x] Primary Image URL field added to product form; if left blank on create, a random stock image is automatically assigned.

- **7. Global Number Formatting** ✅ **COMPLETE**
  - [x] Created `lib/format.ts` with `formatNumber(amount: number)` for comma-separated numbers (e.g., `1,234`).  
  - [x] Created `formatCurrency(amount: number)` for currency formatting with dollar sign and commas (e.g., `$12,345.67`).  
  - [x] Applied formatting across all admin dashboard pages (Finance, Inventory, Orders, etc.).

- **8. Homepage Layout System** ✅ **COMPLETE**
  - [x] Implemented homepage layout switcher in Content Manager (Classic Editorial / Drop Feed).  
  - [x] Layout selector moved from System Settings to Content Manager page for better UX.  
  - [x] Hero section supports both video and image URLs, dynamically rendering `<video>` or `<img>` based on URL content.  
  - [x] Classic Editorial layout includes duplicated hero blocks with white line separator and two-column promotional sections (Featured Split + Banner).

- **9. Content Manager Image/Video Support** ✅ **COMPLETE**
  - [x] Hero section supports video or image URL (labeled "Hero Media URL").  
  - [x] Featured Split section includes Image URL field.  
  - [x] Banner section includes Image URL field.  
  - [x] Three Columns section supports image URLs for each column.  
  - [x] All content blocks save automatically with live preview updates.

- **10. Additional Enhancements** ✅ **COMPLETE**
  - [x] Added "Getting Started" checklist card on admin dashboard that dynamically updates based on system configuration.  
  - [x] Order details viewable by clicking order numbers in admin orders list.  
  - [x] AI Assistant made context-aware: checks for actual data in database and adjusts responses accordingly (explains lack of data vs. fabricating metrics).

**Exit Criteria**: All Phase 12 items are complete. System reset, help modals, AI chat history, demo data seeding, API tracking, product management, number formatting, and homepage layout customization are all functional and tested.

## Working Checklist (High Level)
- **Foundation**
  - [x] Next.js + Prisma + Tailwind base in place
  - [x] Core DB schema migrated (users, products, variants, cart, orders, content, finance/ops tables)
- **Storefront & Accounts**
  - [x] Homepage, Shop, Cart, Checkout flows implemented (product detail page still to be finalized)
  - [x] Core user dashboard tabs implemented (Profile, Addresses, Wishlist, Settings, Payment Methods)
- **Admin Core**
  - [x] Admin dashboard, Content Manager, Products, Inventory
  - [x] Orders and Customers management
- **Finance & Operations**
  - [x] Finance Hub core screens (COGS, Expenses, Profit, AI Pricing) implemented
  - [x] Operations Hub core screens (Suppliers, basic Logistics) implemented; POs still pending
-- **AI & Analytics**
  - [x] AI Assistant and AI insight endpoints
  - [x] Advanced analytics dashboards
-- **Launch**
  - [ ] Testing and QA (scripted pass)
  - [ ] Production deployment and verification

---

## Current Status Snapshot (End of Phase 12)
- **Phase 0 – Foundation**: Complete  
  - Next.js + TypeScript + Tailwind + Prisma set up, `lib/prisma`, `lib/auth`, `lib/deepseek`, `lib/stripe` wired.  
  - PostgreSQL schema migrated (users, products, variants, cart, orders, content, finance, suppliers, addresses, wishlist, etc.).

- **Phase 1 – Storefront (partial)**  
  - Homepage and `/shop` are implemented and reading from real DB + `Content`.  
  - Cart and checkout shells are in place; product detail page still needs to be finalized to match `02-product-detail.html` and project rules.

- **Phase 2 – Cart, Checkout & Accounts**: Complete  
  - NextAuth credentials login, protected `/checkout` and `/account/*`.  
  - Cart APIs (`/api/cart/*`), Stripe Payment Element, order creation, address management, TaxJar + SmartyStreets hooks, and account tabs (Profile, Addresses, Wishlist, Settings, Payment Methods) are all implemented and backed by Prisma.

- **Phase 3 – Core Admin Hub**: Complete  
  - Admin shell and role-protected `/admin/*` routes, dashboard KPIs, Orders & Customers hub, Content Manager, Products, and Inventory (with stock history logging) are implemented against Prisma.  

- **Phase 4 – Finance Hub**: Complete  
  - COGS Manager, Expense Tracking, Profit & Loss (with time windows like last 30 days and YTD), AI Pricing Engine backed by DeepSeek, and API Calls & Pricing tracking page are implemented with auditable calculations.

- **Phase 5 – Operations Hub**: Complete  
  - Supplier management, outbound Logistics, and a Purchase Orders system (with statuses, basic receiving, and integration into `ProductVariant` and `StockHistory`) are implemented so inbound stock updates inventory with an audit trail.

- **Phase 6 – AI Intelligence Hub & Analytics**: Complete  
  - AI Assistant (`/admin/ai-assistant`) backed by DeepSeek with chat history, sessions, and context-aware responses plus an `/admin/analytics` dashboard with core sales and customer metrics and trend views are implemented.

- **Phase 7 – Post-Launch Enhancements (Phases 8-12)**: Complete  
  - Phase 8: Owner-friendly API key management with encrypted storage.  
  - Phase 9: Marketing Hub with campaign overview and metrics.  
  - Phase 10: SEO Tools with product SEO coverage tracking.  
  - Phase 11: System Settings with brand configuration and feature toggles.  
  - Phase 12: UX Polish including system reset, page-level help modals, AI chat history, demo data seeding, API tracking, product management enhancements, global number formatting, and homepage layout customization.

- **Phase 7 (Original)**: Testing, hardening, and launch tasks remain and will be executed next according to this plan.

---

## What I Need From You to Proceed with Phase 3–7
- **For Phase 3 – Core Admin Hub**
  - **Dashboard KPIs priorities**: Which 3–5 KPIs matter most on `/admin` (e.g., revenue last 30 days, orders today, active customers, inventory at risk)?  
  - **Orders detail expectations**: Do you want refunds and status changes to fully sync with Stripe in this phase, or just internal status toggles for now?  
  - **Customer view fields**: Confirm which customer metrics you care about (LTV, AOV, last order date, total orders, tags/segments).

- **For Phase 4 – Finance Hub**
  - **Reporting windows**: Which time buckets are required (MTD, last 30 days, last quarter, custom date range)?  
  - **P&L layout**: Any specific finance format you want (e.g., GAAP‑like sections or a simpler “Revenue / COGS / Gross Profit / Expenses / Net” layout only)?  
  - **AI pricing inputs**: Confirm if we should assume only internal data (sales + COGS + discounts) or if you plan to add competitor data feeds later.

- **For Phase 5 – Operations Hub**
  - **PO workflow detail**: Which statuses are required now (Draft, Sent, Confirmed, In Production, Shipped, Received, Cancelled), and which actions each role can perform.  
  - **Receiving & QC fields**: What exactly should be captured when receiving stock (received qty, damaged qty, QC notes, photos, etc.).

- **For Phase 6 – AI & Analytics**
  - **Analytics focus**: Rank which analytics dashboards matter first (sales trends, product performance, customer cohorts, funnel/conversion, marketing/campaigns).  
  - **AI assistant tone**: More “analyst” voice (numbers and bullet points) or “operator” voice (plain English recommendations and next steps).

- **For Phase 7 – Launch**
  - **Target hosting**: Confirm intended host (e.g., Vercel + managed Postgres) so we can shape environment and logging.  
  - **Testing depth**: Whether you want minimal “smoke test + a few API tests” or a more thorough test pass with scripted test cases.

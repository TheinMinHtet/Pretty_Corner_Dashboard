# Stage 5 (Initial Zoom Out Review) Report

**Target:** [promotion_routing_and_banner_integration.md](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L1-L360) (Lines 1–360)

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |
| `egm-inventive-catalyst` | completed |

## Severity Breakdown
* 🔴 **Blockers:** 2
* 🟡 **Major Issues:** 3
* 🟢 **Nits:** 2

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Infeasible Supabase Atomic Increment & Missing Storefront Server API Boundary - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** [Lines 278-293](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L278-L293) (Section 5.9: Zero-Trust Server Order Validation Pipeline) & [Lines 353-360](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L353-L360) (Section 7.1 Phase 5)
* **Discrepancy Description**:
  The technical design specifies an atomic PostgreSQL conditional update (`UPDATE promotions SET usage_count = usage_count + 1 WHERE id = $1 AND (usage_limit IS NULL OR usage_count < usage_limit);`) inside a storefront endpoint `/api/orders` to prevent race conditions during flash sales. However:
  1. `D:/Pretty_Corner` (Storefront) has **no `/api/orders` route**. In current production code (`StorefrontRepository.ts`), order creation attempts to POST to the Admin Dashboard API (`getApiBaseUrl() + '/api/orders'`) and falls back to direct client-side Supabase writes.
  2. The `@supabase/supabase-js` client SDK used across both repositories does not support raw SQL arithmetic like `usage_count = usage_count + 1` via `.update()`. Performing this via standard `.update({ usage_count: existing + 1 })` introduces a severe read-modify-write race condition during simultaneous checkouts.
  3. Direct client-side Supabase writes from the storefront bypass any backend verification unless Supabase Row Level Security (RLS) or database triggers enforce it.
* **Rationale & Recommendation**:
  Establish a single authoritative order ingress seam:
  - Either route all storefront checkout submissions strictly through `D:/Pretty_Corner_Dashboard/src/app/api/orders/route.ts` (deprecating direct client-side Supabase order inserts in Storefront),
  - Or implement a Supabase Postgres RPC function (`create_storefront_order_with_promotion`) that atomically validates the promotion, updates `usage_count`, and inserts the order inside a single database transaction.

---

### 2. Schema Redundancy & Ground-Truth Parity Gap (`custom_destination`/`target_ids` vs `cta_link`/`featured_product_ids`) - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** [Lines 153-174](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L153-L174) (Section 5.3: Database Schema Extensions) & [Lines 325-331](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L325-L331) (Section 7.1 Phase 1)
* **Discrepancy Description**:
  Section 5.3 proposes adding `custom_destination TEXT` and `target_ids TEXT[]` to the Supabase `promotions` table. However, inspecting existing production types and database repositories (`D:/Pretty_Corner_Dashboard/src/lib/dev-store/supabase-repository.ts`, `D:/Pretty_Corner/src/lib/types.ts`, and `HeroBannerSlider.tsx` Line 145) reveals that:
  - `cta_link: string | null` is **already present** in the Supabase schema and already consumed by `HeroBannerSlider.tsx` (`const ctaDestination = promo.ctaLink || '/shop';`).
  - `featured_product_ids: string[] | null` is **already present** in Supabase and admin types.
  Introducing `custom_destination` alongside `cta_link`, and `target_ids` alongside `featured_product_ids`, creates redundant duplicate fields for identical concepts, violating DRY and causing data divergence between Admin and Storefront.
* **Rationale & Recommendation**:
  Reuse the existing columns. Utilize `cta_link` for custom destinations and `featured_product_ids` for targeted product sets. The only net-new schema columns required are `target_type` (enum/text) and `usage_limit` (integer).

---

### 3. YAGNI Over-Engineering: 3-Phase Compounding Stacking Engine (`CartEngine.ts`) - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** [Lines 246-264](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L246-L264) (Section 5.7: Deterministic Sequential Compounding Stacking Engine) & [Lines 297-301](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L297-L301) (Section 6.1)
* **Discrepancy Description**:
  The document prescribes a complex 3-tier sequential compounding engine (Item $\to$ Category $\to$ Storewide) with an artificial 60% cumulative safety margin ceiling. However:
  1. The storefront UI and state model (`StoreContext.tsx`) only support a single promo code (`appliedPromo: Promotion | null`). There is no operational workflow where a customer enters multiple coupon vouchers.
  2. Compounding discount percentages ($P \times (1-d_1) \times (1-d_2)$) yields non-intuitive effective prices for customers (e.g. 20% + 20% produces a 36% discount rather than 40%).
  3. Product-level discounts (`regularPrice` vs `salePrice`) are already modeled on the `Product` entity. Stacking multiple promotion code tiers is a premature, unneeded abstraction (YAGNI).
* **Rationale & Recommendation**:
  Simplify to a 2-stage pricing model: (1) Effective Catalog Price (`salePrice ?? regularPrice`), and (2) Single Active Promotion Code applied to eligible line items (matching `target_type` and `featured_product_ids`), or as a storewide discount. Drop the 3-phase compounding pipeline and arbitrary 60% ceiling.

---

### 4. TRIZ Contradiction: Dynamic Stockout Deactivation vs Storefront Read Performance - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** [Lines 266-276](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L266-L276) (Section 5.8: Multi-Factor Automated Deactivation Engine)
* **Discrepancy Description**:
  - *Technical Contradiction*: Accuracy of campaign status (auto-hiding banners when all targeted items sell out) versus Storefront latency and database load.
  - As designed, determining whether a `SELECTED_PRODUCTS` or `CATEGORY` campaign is active requires aggregating stock quantities across all target products on every banner fetch. In high-traffic scenarios, this forces multi-row relational scans and joins on the critical homepage rendering path.
* **Rationale & Recommendation**:
  - *TRIZ Resolution (Principle 19: Periodic Action / Principle 2: Separation in Time)*: Decouple inventory depletion detection from the synchronous storefront read path. Evaluate stockout deactivation asynchronously at write-time (during stock adjustments or order checkout completion in `adjustStock` / `createOrder`). If all linked products reach 0 stock, toggle an indexed boolean flag `is_out_of_stock` on the promotion row. The storefront then queries promotions using a fast indexed lookup (`is_active = true AND is_out_of_stock = false`).

---

### 5. TRIZ Contradiction: URL Parameter State Leaks vs Component Encapsulation in Auto-Code Ingestion - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** [Lines 177-217](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L177-L217) (Section 5.4) & [Lines 233-244](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L233-L244) (Section 5.6)
* **Discrepancy Description**:
  - *Technical Contradiction*: Frictionless promo code application (zero typing) versus Navigation hygiene and deterministic session state.
  - Deriving internal navigation destinations with appended query strings (`/product/:slug?promo=CODE` or `/promotions/:slug?promo=CODE`) forces the storefront to rely on URL parsing on every page change. This pollutes browser history, causes unintended promo code overrides when URLs are copied/shared, and couples internal component transitions to browser URL query strings.
* **Rationale & Recommendation**:
  - *TRIZ Resolution (Principle 10: Prior Action & Principle 25: Self-Service)*: When a user clicks a hero banner in `HeroBannerSlider.tsx`, invoke `applyPromoCode(promo.code)` directly in `StoreContext` and persist to `sessionStorage` *before* executing the client router transition. Keep URL query parameter ingestion (`?promo=CODE`) purely as a secondary listener for external inbound marketing campaigns (e.g., social media ads).

---

### 6. Unnecessary Mandatory Unique Slug for Non-Hub Promotions - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** [Lines 159-160](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L159-L160) (Section 5.3) & [Lines 182-190](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L182-L190) (Section 5.4)
* **Discrepancy Description**:
  The DDL migration enforces `ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;` across all promotions. However, `slug` is only utilized when `target_type === 'SELECTED_PRODUCTS'` to construct the `/promotions/[slug]` route. Storewide, Category, and Single Product promotions route directly to existing catalog routes (`/shop`, `/shop?category=...`, `/product/:slug`). Requiring admins to create unique slugs for simple storewide discount codes introduces unnecessary back-office friction.
* **Rationale & Recommendation**:
  Make `slug` optional (`slug TEXT UNIQUE NULL`). Auto-generate a slug only when `target_type === 'SELECTED_PRODUCTS'`.

---

### 7. Code Duplication Risk in `/promotions/[slug]` Grid - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** [Lines 221-231](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L221-L231) (Section 5.5) & [Line 339](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md#L339) (Section 7.1 Phase 3)
* **Discrepancy Description**:
  Section 5.5 specifies building a new product grid in `/promotions/[slug]/page.tsx` displaying products with badges and steppers. If built from scratch, this duplicates the card rendering, responsive breakpoints, filter states, and cart interactions already standardized in `/shop`.
* **Rationale & Recommendation**:
  Reuse the existing catalog product grid and card components directly. Ensure the promotion hub page functions as a curated container view rather than a reimplemented catalog.

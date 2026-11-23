# Comprehension Test Report: Promotion Routing & Banner Integration

* **Target Document:** [promotion_routing_and_banner_integration.md](file:///D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md)
* **Active Scope:** Lines 1–360 (Feature Range: 1–318; Detailed Implementation: 319–360)
* **Auditor Role:** Comprehension Goldfish (Naive Fresh-Reader Persona)

---

## High-Level Paraphrase

### What this proposes
This document specifies an integrated promotional routing, automated deactivation, and discount stacking engine shared across two separate Next.js applications—an administrative dashboard (`D:/Pretty_Corner_Dashboard`) and a customer-facing storefront (`D:/Pretty_Corner`)—backed by a common Supabase PostgreSQL instance. It introduces deterministic destination routing for marketing hero banners across four targeting tiers (single product, curated product set, category, or whole store), dynamic campaign landing pages (`/promotions/[slug]`), frictionless promotion code ingestion into customer browser sessions, a 3-phase compounding discount engine (Item $\to$ Category $\to$ Storewide) capped at a 60% margin ceiling, multi-factor campaign deactivation based on time, usage quotas, and stock depletion, and server-authoritative checkout validation with atomic database locking to prevent client-side tampering and over-redemption.

### How the existing system works, per this document
Currently, promotional hero banners in the customer storefront (`HeroBannerSlider.tsx`) navigate shoppers strictly to a generic `/shop` catalog page, forcing customers to manually search for promoted items. There is no dynamic multi-product landing route to display curated campaign selections, meaning admins cannot direct marketing traffic to custom item groups without hardcoding custom pages. Cart calculation in `CartEngine.ts` is limited to applying a single, flat percentage discount across the entire subtotal, unable to stack item or category sales with storewide vouchers, and checkout totals are calculated client-side without authoritative server revalidation. Lastly, campaign deactivation is completely manual; banners and promotions remain live and clickable even after campaigns expire, reach their usage limit, or sell out of inventory.

---

## Technical Mechanism Paraphrase

* **Banner Destination Derivation (`resolvePromotionDestination.ts`)**: A pure, stateless utility function takes promotional metadata (target type, campaign slug, promo code, target product slug, or target category slug) and deterministically constructs the storefront destination URL. A `SINGLE_PRODUCT` promotion produces `/product/:slug?promo=CODE`, `SELECTED_PRODUCTS` routes to a dedicated campaign hub at `/promotions/:slug?promo=CODE`, `CATEGORY` routes to `/shop?category=:slug&promo=CODE`, and `ENTIRE_STORE` falls back to `/shop?promo=CODE`. An optional custom destination string can override this derivation.
* **Frictionless Session Ingestion (`StoreContext.tsx`)**: When a shopper clicks a promotional banner or visits a promotional URL containing `?promo=CODE`, storefront context captures the query parameter, fires a visual toast confirmation, and stores the promo code in `sessionStorage` (`pretty_corner_active_promo`). The code is automatically injected into the checkout voucher input, displaying an "Auto-Applied" status badge and giving the customer options to switch or remove it.
* **Dynamic Promotional Hub (`/promotions/[slug]/page.tsx`)**: A dynamic storefront page unwraps the route slug asynchronously (Next.js 16 App Router compliance), displays a campaign hero banner, description, countdown timer, and promotional badge, and renders a grid of eligible products. If all products are out of stock or the campaign is invalid, the page renders an editorial fallback indicating the promotion has concluded with a call to action directing users to `/shop`.
* **Sequential Compounding Discount Engine (`CartEngine.ts`)**: Rather than summing discount percentages additively, discounts apply in three sequential stages. First, an item discount ($d_{item}\%$) reduces the original price $P$ to $P_1$. Next, any category discount ($d_{cat}\%$) reduces $P_1$ to $P_2$. Finally, a storewide voucher ($d_{store}\%$) reduces the overall order. Total cumulative discounts per line item are strictly clamped at a maximum 60% margin safety ceiling, and line totals cannot drop below zero. If multiple discounts occur within the same tier, the highest percentage takes precedence.
* **Multi-Factor Automated Deactivation**: A promotion is excluded or disabled when the current timestamp is outside its active start/end window, when recorded `usage_count` meets or exceeds `usage_limit`, or when target inventory is depleted. For `SELECTED_PRODUCTS`, the system applies partial degradation: as long as at least one linked product has inventory, the campaign remains active showing only available items; it auto-disables only when 100% of linked products reach zero stock.
* **Server-Authoritative Order Verification (`/api/orders`)**: When an order is placed, the backend endpoint ignores client-calculated pricing. It independently queries Supabase for product regular prices and promotion validity, re-runs the 3-phase calculation, and executes an atomic conditional update (`UPDATE promotions SET usage_count = usage_count + 1 WHERE id = $1 AND (usage_limit IS NULL OR usage_count < usage_limit)`). If the quota was exhausted concurrently, the transaction aborts with `409 Conflict`.

---

## Comprehension Findings

### 1. Disconnect Between Database Schema (`target_ids`) and Destination Resolver (`targetProductSlug` / `targetCategorySlug`)
* **Severity:** 🔴 Blocker
* **Affected Scope:** Section 5.3 (Lines 158–167), Section 5.4 (Lines 181–216), Section 7.1 Phase 3 (Line 338)
* **Discrepancy Description & Rationale:**
  * In Section 5.3, the DDL migration adds `target_ids TEXT[] DEFAULT '{}'` to `promotions`. It does *not* add `target_product_slug` or `target_category_slug`.
  * In Section 5.4, `resolvePromotionDestination` requires `input.targetProductSlug` for `SINGLE_PRODUCT` and `input.targetCategorySlug` for `CATEGORY`.
  * In Section 7.1 Phase 3, `HeroBannerSlider.tsx` is instructed to call `resolvePromotionDestination(promo)`.
  * **Gap:** If `promotions` only stores `target_ids: string[]`, where do `targetProductSlug` and `targetCategorySlug` come from? Does `target_ids` store UUIDs or slugs? If it stores UUIDs, `HeroBannerSlider` would need to perform asynchronous joins against `products` and `categories` tables to retrieve slugs before calling the pure resolver function, which is not documented. If `target_ids` stores slugs, why is the column named `target_ids` instead of `target_slugs`? A developer implementing `HeroBannerSlider` has no instruction on how `target_ids` maps to `targetProductSlug` or `targetCategorySlug`.

### 2. Multi-Tier Compounding Engine vs. Single Promo Code Architecture Conflict
* **Severity:** 🔴 Blocker
* **Affected Scope:** Section 5.2 (Lines 141–144), Section 5.6 (Lines 237–242), Section 5.7 (Lines 247–264), Section 5.9 (Line 281)
* **Discrepancy Description & Rationale:**
  * Section 5.7 defines a 3-Phase Compounding model combining Item Discount ($d_{item}\%$) $\to$ Category Discount ($d_{cat}\%$) $\to$ Storewide Coupon ($d_{store}\%$).
  * However, Section 5.6 specifies that customer session storage stores only one code (`pretty_corner_active_promo`), the cart UI allows customers to "remove or switch codes" (singular), and Section 5.2 / Section 5.9 show the order API accepting a single code payload (`promoCode: "GLOW20"`).
  * **Gap:** If the customer and checkout payload can only hold one promotion code at a time, how does a cart ever trigger multi-tier compounding discounts? Are item and category discounts automatically applied without promo codes (e.g., catalog sale prices)? If they are automatic, why does Section 5.3 set `redemption_method TEXT NOT NULL DEFAULT 'CODE'` as the table default for all promotions? The document does not define how multiple promotions across different tiers are collected or applied in the cart when both session state and order payloads only accommodate a single promo code.

### 3. Mathematical Contradiction: Storewide Subtotal Discount vs. Line-Item Margin Ceiling
* **Severity:** 🟡 Major
* **Affected Scope:** Section 5.7 (Lines 254–260)
* **Discrepancy Description & Rationale:**
  * Line 254 defines Step 3 as: `Total Storewide Discount applied to sum(P_2 * Q)`.
  * Line 258 states: `Total cumulative discount per line item is clamped at a maximum ceiling of 60% of original retail price P`.
  * **Gap:** Applying a percentage discount to the aggregate order subtotal (`sum(P_2 * Q)`) contradicts clamping discounts per line item. For example, if line item A already has a 55% discount from Steps 1 & 2, and the customer applies a 20% storewide voucher to the subtotal, line item A would effectively receive a 64% discount ($P \times 0.45 \times 0.80 = 0.36P$), breaching the 60% per-line ceiling unless the storewide voucher is apportioned or evaluated item-by-item rather than on the sum. The document does not specify the exact algorithm for distributing storewide discounts across line items while maintaining the 60% line cap.

### 4. Inconsistent Database Column Naming for Promotion Dates (`start_date` vs. `starts_at`)
* **Severity:** 🟡 Major
* **Affected Scope:** Section 5.3 (Line 172) vs. Section 5.8 (Line 269)
* **Discrepancy Description & Rationale:**
  * In Section 5.3, the index definition references `idx_promotions_active_lookup ON promotions(is_active, start_date, end_date)`.
  * In Section 5.8, rule 1 explicitly references `Current timestamp < starts_at OR > ends_at`.
  * **Gap:** The document alternates between `start_date` / `end_date` and `starts_at` / `ends_at`. A fresh developer implementing these queries will encounter runtime column-not-found errors without knowing which column names actually exist in the base Supabase schema.

### 5. Ambiguity in Automated Deactivation Execution and Missing Inventory Join Strategy
* **Severity:** 🟡 Major
* **Affected Scope:** Section 5.8 (Lines 266–276), Section 7.1 Phase 4 (Line 349)
* **Discrepancy Description & Rationale:**
  * Section 5.8 states: "A promotion is deactivated (`is_active = false`) or dynamically filtered out when...".
  * **Gap:** It is completely unexplained whether `is_active = false` is an active database mutation or a derived runtime state. If it is a mutation, who executes it (a cron worker, a database trigger, or middleware)? If it is purely dynamic filtering during queries, what does `(is_active = false)` refer to?
  * Furthermore, checking whether "100% of linked items are out of stock" or "zero in-stock active items in that category" requires joining promotions with product inventory. The document does not explain how `HeroBannerSlider` or the homepage query performs this check without incurring N+1 query overhead across all active promotional banners.

### 6. Orphaned Schema Columns: `per_customer_limit` and `minimum_order_amount`
* **Severity:** 🟡 Major
* **Affected Scope:** Section 5.3 (Lines 165–166), Section 5.9 (Lines 279–293), Section 7.1 Phase 1 (Line 326)
* **Discrepancy Description & Rationale:**
  * Section 5.3 adds `per_customer_limit INTEGER DEFAULT 1` and `minimum_order_amount NUMERIC DEFAULT 0`.
  * **Gap:** Neither column is ever referenced, validated, or enforced in the pricing engine (`CartEngine.ts`, Section 5.7) or the order validation pipeline (`/api/orders`, Section 5.9). The document does not describe how customer identity is checked against redemption history (e.g., matching customer phone number against previous records in `orders`) or how `minimum_order_amount` conditions are verified before applying discounts.

### 7. Undefined Enum Values for `RedemptionMethod` and Unmapped `SELECTED_PRODUCTS` Compounding Step
* **Severity:** 🟡 Major
* **Affected Scope:** Section 5.3 (Line 163), Section 5.7 (Lines 250–264), Section 7.1 Phase 1 (Line 326)
* **Discrepancy Description & Rationale:**
  * Line 163 and Line 326 introduce `redemption_method: RedemptionMethod` with default `'CODE'`, but nowhere in the document are the enum variants defined (e.g., `'CODE' | 'AUTOMATIC'`).
  * Additionally, Section 3 and 5.4 define four target types: `SINGLE_PRODUCT`, `SELECTED_PRODUCTS`, `CATEGORY`, `ENTIRE_STORE`. However, Section 5.7 defines a 3-step compounding engine: `Item Discount`, `Category Discount`, and `Storewide Coupon`.
  * **Gap:** Where does `SELECTED_PRODUCTS` map in the 3 steps? Is it treated as an Item Discount (Step 1)? If an item belongs to a `SINGLE_PRODUCT` promotion and a `SELECTED_PRODUCTS` promotion, are they mutually exclusive under the "same target tier" rule (Line 262)? They have distinct `target_type` enum values, so the rule as written does not clearly resolve their priority.

### 8. Inconsistent Product Route URL Convention (`/product/:slug` vs. `/product/[id]`)
* **Severity:** 🟢 Nit
* **Affected Scope:** Section 3 (Line 42), Section 5.1 (Line 86), Section 5.4 (Line 201)
* **Discrepancy Description & Rationale:**
  * Line 42 lists `/product/:slug` as the target URL, and line 201 returns `/product/${input.targetProductSlug}`.
  * In contrast, line 86 in the architecture diagram labels the storefront route as `Product Detail Page (/product/[id])`.
  * **Gap:** A developer cannot tell whether the customer storefront uses product IDs (UUIDs) or product slugs for product detail routing.

### 9. Cross-Repository Test Script Location and Import Feasibility
* **Severity:** 🟢 Nit
* **Affected Scope:** Section 7.1 Phase 2 (Line 335)
* **Discrepancy Description & Rationale:**
  * Line 335 places `test-promotion-architecture.mjs` in `D:/Pretty_Corner_Dashboard/scripts/`, but the core modules under test (`CartEngine.ts` and `resolvePromotionDestination.ts`) reside in `D:/Pretty_Corner/src/lib/`.
  * **Gap:** The document specifies that these are two distinct repositories in separate file trees. It does not explain how a Node.js script in the Dashboard repository will import and transpile TypeScript modules from the storefront repository without cross-package workspace tooling.

### 10. Assumed Banner Asset Fields in `promotions` Table
* **Severity:** 🟢 Nit
* **Affected Scope:** Section 5.1 (Line 76), Section 5.3 (Lines 158–167), Section 6.2 (Lines 302–306)
* **Discrepancy Description & Rationale:**
  * Section 6.2 rejects a dedicated `banners` table because active promotions maintain a 1:1 relationship with hero banners.
  * **Gap:** Section 5.3 details all added schema columns, but none include banner visual assets (such as `image_url` or `banner_image`). The document assumes the reader already knows that `promotions` contains banner image columns without defining or documenting the existing schema.

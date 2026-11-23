# Critic Review Report: Promotion Routing & Banner Integration (End-to-End Architecture)

**Target:** `D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md` (`Lines 1..318`)

## Reviewer Status

| Reviewer | Status | Lens / Scope |
| --- | --- | --- |
| `egm-design` | completed | System architecture, UX, data flow, failure modes, race conditions, edge cases |
| `egm-structural` | completed | Structural layout, document hierarchy, template compliance, table formatting |
| `egm-style` | completed | Precision, clarity, brevity, objective phrasing, removal of fluff/buzzwords |

---

## Executive Summary
* **Severity Breakdown:** 🔴 **3 Blockers** | 🟡 **6 Majors** | 🟢 **5 Nits**
* **Total Prioritized Findings:** 14
* **Verdict:** The technical specification is architecturally mature and well-structured, but requires remediation of critical SQL NULL-comparison quota failures, missing slug resolution data flows, and unvalidated URL redirect vectors before commencing implementation.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Critical SQL Quota Increment Bug on Unlimited Promotions (`NULL` Comparison Failure) - Severity: Blocker
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Line 145 (Section 5.2) vs Line 289 (Section 5.9)
* **Discrepancy Description**: In Section 5.2 (Sequence diagram line 145), the atomic quota increment SQL query is defined as:
  ```sql
  UPDATE promotions SET usage_count = usage_count + 1 WHERE id = $1 AND usage_count < usage_limit;
  ```
  However, in Section 5.3 (line 164), `usage_limit` defaults to `NULL` for campaigns with unlimited redemptions. In ANSI SQL and PostgreSQL, comparing any integer with `NULL` (`usage_count < NULL`) evaluates to `UNKNOWN` (falsy), resulting in 0 rows updated. Any order attempting to redeem an unlimited promotion following the Section 5.2 sequence specification will abort checkout with an error. While Section 5.9 includes `usage_limit IS NULL OR`, the conflicting definition in 5.2 creates an implementation hazard.
* **Rationale & Recommendation**: Align Section 5.2 sequence diagram note to use the complete null-safe conditional update:
  `UPDATE promotions SET usage_count = usage_count + 1 WHERE id = $1 AND (usage_limit IS NULL OR usage_count < usage_limit);`.
  Additionally, wrap this statement inside a serializable or row-locked transaction (`SELECT ... FOR UPDATE` or conditional check within `BEGIN ... COMMIT`) to prevent race condition quota leaking if the subsequent `INSERT INTO orders` fails.

---

### 2. Missing Relational Slug Resolution for `SINGLE_PRODUCT` and `CATEGORY` Destinations - Severity: Blocker
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 160–167 (Section 5.3), 181–217 (Section 5.4)
* **Discrepancy Description**: Section 5.3 defines the table schema additions as storing only `target_ids TEXT[] DEFAULT '{}'` (containing UUIDs/IDs). However, `resolvePromotionDestination(input)` in Section 5.4 expects `targetProductSlug` and `targetCategorySlug` on `ResolveDestinationInput` to build storefront routes `/product/:slug` and `/shop?category=:slug`. The document does not define how or where these slugs are queried. If `HeroBannerSlider.tsx` queries only the `promotions` table, these slug arguments will be `undefined`, causing lines 202 and 210 to silently fall back to the generic catalog route `/shop`, entirely defeating Goal #1.
* **Rationale & Recommendation**: Either:
  1. Denormalize target slugs into the `promotions` table by adding columns `target_slug TEXT` (or `target_slugs TEXT[]`), populated on creation in the admin dashboard; OR
  2. Specify an explicit Supabase relational join / RPC in the data access layer:
     `supabase.from('promotions').select('*, products:target_ids(slug), categories:target_ids(slug)')`.
  Document this contract explicitly in Section 5.3 and 5.4.

---

### 3. Open Redirect and Client-Side Script Injection Vulnerability in `custom_destination` - Severity: Blocker
* **Reviewer Lens:** `egm-design` / `egm-style`
* **Affected Scope:** Lines 167 (Section 5.3), 191–194 (Section 5.4)
* **Discrepancy Description**: The resolver logic in Section 5.4 returns `input.customDestination.trim()` verbatim without protocol or boundary sanitization:
  ```typescript
  if (input.customDestination?.trim()) {
    return input.customDestination.trim();
  }
  ```
  If a compromised admin account or a malicious database update injects an external phishing URL (`https://attacker-controlled.site/login`) or a pseudo-protocol (`javascript:alert(document.cookie)`), storefront banner clicks will navigate users off-site or execute arbitrary scripts in the customer's browser. Furthermore, returning immediately bypasses appending the promotional code (`codeParam`), causing coupon tracking loss.
* **Rationale & Recommendation**: Enforce strict URL sanitization:
  1. Mandate that `customDestination` must begin with a single `/` and reject protocol prefixes (`http:`, `https:`, `//`, `javascript:`).
  2. Append `codeParam` to custom destinations appropriately (checking whether `customDestination` already contains a `?` query string delimiter).
  3. Validate this constraint both in Zod schemas on the dashboard and at runtime in `resolvePromotionDestination`.

---

### 4. Inconsistent Column Identifiers and Broken Index Target (`start_date`/`end_date` vs `starts_at`/`ends_at`) - Severity: Major
* **Reviewer Lens:** `egm-structural` / `egm-design`
* **Affected Scope:** Lines 172 (Section 5.3) vs Line 269 (Section 5.8)
* **Discrepancy Description**: In Section 5.3, the index migration references `start_date` and `end_date`:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_promotions_active_lookup ON promotions(is_active, start_date, end_date);
  ```
  However, in Section 5.8, the deactivation engine references `starts_at` and `ends_at`:
  `1. Temporal Expiry: Current timestamp < starts_at OR > ends_at.`
  Using conflicting names across schema definitions, queries, and business logic guarantees either a PostgreSQL migration error or runtime lookup failure.
* **Rationale & Recommendation**: Standardize on a single column naming convention across the entire document. If the existing Supabase table uses `start_date` and `end_date`, update Section 5.8 to reference `start_date` and `end_date`. If it uses `starts_at` and `ends_at`, update Section 5.3 accordingly.

---

### 5. Unenforced Schema Field: `per_customer_limit` Lacks Tracking Ledger - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Line 165 (Section 5.3), Lines 278–293 (Section 5.9)
* **Discrepancy Description**: Section 5.3 adds `per_customer_limit INTEGER DEFAULT 1` to `promotions`. However, neither Section 5.2 (Sequence Diagram) nor Section 5.9 (Server Order Validation Pipeline) includes any logic, query, or schema table to verify customer redemption counts. The order payload contains `{ customerName, phone, deliveryAddress, township, items, promoCode }`, but without an order history check or a dedicated `promotion_redemptions` table tracking `(promotion_id, customer_phone | customer_id)`, a single customer can reuse the code an unlimited number of times up to the global `usage_limit`.
* **Rationale & Recommendation**: Either:
  1. Fully specify the validation step in Section 5.9: `SELECT COUNT(*) FROM orders WHERE promo_code = $1 AND customer_phone = $2` and block checkout if count $\ge \text{per\_customer\_limit}$; OR
  2. If per-customer limiting is out of scope for this phase, move `per_customer_limit` to Section 4 (Non-Goals) and remove the column from the DDL migration in Section 5.3.

---

### 6. Ambiguous Evaluation Order & Scope for `minimum_order_amount` - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Line 166 (Section 5.3), Lines 246–264 (Section 5.7)
* **Discrepancy Description**: Column `minimum_order_amount NUMERIC DEFAULT 0` is added to the schema, but Section 5.7 (Compounding Stacking Engine) completely omits it from the 3-phase calculation flow. It is ambiguous whether `minimum_order_amount` applies to:
  1. The raw catalog subtotal before any discounts;
  2. The subtotal of only products that qualify for the promotion; or
  3. The post-item and post-category subtotal before applying a storewide coupon.
* **Rationale & Recommendation**: Explicitly define the evaluation stage in Section 5.7. Specify whether the qualification check runs against the cumulative eligible item subtotal after item-tier discounts are applied, and clarify the error response returned by the server if the threshold is not met.

---

### 7. Lack of Storewide Discount Allocation / Proration Across Line Items - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Line 254 (Section 5.7), Lines 278–293 (Section 5.9)
* **Discrepancy Description**: In Section 5.7, Step 3 computes `Total Storewide Discount applied to sum(P_2 * Q)`. However, e-commerce order persistence requires recording the exact discount amount and net line item price on each row in `order_items`. Without a deterministic proportional distribution algorithm (allocating the storewide coupon proportionally by line item value with fractional remainder handling), partial returns, single-item refunds, or tax calculations become mathematically impossible to reconcile.
* **Rationale & Recommendation**: Add a subsection in 5.7 defining the weighted proration formula:
  $$\text{LineDiscount}_{\text{storewide}} = \text{round}\left(\text{TotalStorewideDiscount} \times \frac{P_2 \times Q}{\sum (P_2 \times Q)}\right)$$
  and specify how rounding discrepancies (Kyat remainders) are allocated to the highest-value line item.

---

### 8. High Real-Time Relational Overhead for Storefront Inventory Deactivation - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 266–276 (Section 5.8)
* **Discrepancy Description**: Section 5.8 requires banners and promotions to automatically deactivate or hide when 100% of linked products (for `SELECTED_PRODUCTS` or `CATEGORY`) are out of stock. Performing real-time stock aggregation across all target products on every storefront homepage visit (`HeroBannerSlider.tsx`) introduces significant database query overhead and latency, especially during high-traffic flash sale events.
* **Rationale & Recommendation**: Introduce an asynchronous or event-driven mechanism:
  1. Add an inventory trigger / webhook on `products` stock change that re-evaluates `is_active` or an `in_stock_count` cache on `promotions`; OR
  2. Pre-filter active promotions in an edge-cached Supabase query / RPC with a short TTL (e.g., 60 seconds) rather than running unindexed cross-table scans per request.

---

### 9. Uncontrolled Session State Clobbering on Multi-Banner Navigation - Severity: Major
* **Reviewer Lens:** `egm-design` / `egm-structural`
* **Affected Scope:** Lines 233–244 (Section 5.6)
* **Discrepancy Description**: Section 5.6 dictates that `StoreContext` listens for `?promo=CODE` in URL query parameters and calls `applyPromoCode(code)` into `sessionStorage`. If a customer arrives with an existing coupon (e.g., a personalized 25% retention voucher) and subsequently clicks a 10% banner, their existing voucher is silently overwritten without prompt or comparison.
* **Rationale & Recommendation**: Define overwrite handling in Section 5.6:
  - If `appliedPromoCode` is already populated in `sessionStorage` and differs from the new URL query parameter, trigger a prompt/toast informing the customer ("Replace [OLD_CODE] with [NEW_CODE]?") or only overwrite if the new code provides a greater net discount at checkout.

---

### 10. Unspecified Rounding Mechanics for Myanmar Kyat (MMK) - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 252–253 (Section 5.7)
* **Discrepancy Description**: In Section 5.7, the formula specifies `P_1 = round(P * (1 - d_item / 100))` without specifying rounding precision. Section 4 confirms prices are denominated in MMK. Because MMK does not use fractional currency units (pya subunits are obsolete in retail commerce), standard JavaScript `Math.round()` rounds to integer Kyat, but retail POS and payment gateways often round to the nearest 50 or 100 Kyats.
* **Rationale & Recommendation**: Explicitly state rounding behavior in Section 5.7: "Prices are rounded to the nearest integer Kyat using standard half-up rounding (`Math.round(...)`), guaranteeing integer values for all MMK line totals."

---

### 11. Ambiguous Parameter Name `slug` in `ResolveDestinationInput` - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 184 (Section 5.4)
* **Discrepancy Description**: In interface `ResolveDestinationInput`, the field `slug: string` refers to the promotion campaign slug (used for `/promotions/:slug`), while other properties are named `targetProductSlug` and `targetCategorySlug`. Having `slug` alongside `targetProductSlug` creates cognitive ambiguity for implementing engineers.
* **Rationale & Recommendation**: Rename `slug` to `promotionSlug` in `ResolveDestinationInput` to make property intent unambiguous.

---

### 12. Missing Timezone Specification for Temporal Expiry Comparisons - Severity: Nit
* **Reviewer Lens:** `egm-design` / `egm-style`
* **Affected Scope:** Line 269 (Section 5.8)
* **Discrepancy Description**: Section 5.8 defines temporal expiry as `Current timestamp < starts_at OR > ends_at`. It does not specify whether timestamps are compared against Myanmar Standard Time (MMT, UTC+6:30) or UTC. Since Supabase stores `TIMESTAMPTZ` in UTC and Next.js servers may run in UTC or local time, omitting timezone conversion semantics risks a 6.5-hour timing discrepancy.
* **Rationale & Recommendation**: Specify: "All temporal checks compare `NOW()` in UTC against ISO-8601 UTC timestamps stored in Supabase (`TIMESTAMPTZ`), with the dashboard converting user inputs from Myanmar Standard Time (UTC+6:30) to UTC before persistence."

---

### 13. Promotional Jargon in Architecture Specification Headings - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 33, 36, 278 (Sections 2, 5.9)
* **Discrepancy Description**: The document uses buzzwords and marketing rhetoric such as "Zero-Trust Authoritative Order Verification" and "Frictionless Auto-Code Ingestion". In a formal technical design document, these terms obscure standard architectural patterns.
* **Rationale & Recommendation**: Replace marketing jargon with standard software engineering terminology:
  - "Frictionless Auto-Code Ingestion" $\to$ "Automatic Session Coupon Ingestion"
  - "Zero-Trust Authoritative Order Verification" $\to$ "Server-Authoritative Order Total & Quota Validation"

---

### 14. Omission of Data Dictionary Table in Schema Migration Section - Severity: Nit
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** Lines 157–173 (Section 5.3)
* **Discrepancy Description**: Section 5.3 presents raw SQL DDL without an accompanying schema table. Readers must inspect SQL statements to deduce column nullability, defaults, and business purposes.
* **Rationale & Recommendation**: Precede the DDL code block with a standard Markdown data dictionary table listing Column Name, Data Type, Nullable, Default Value, and Purpose.

# Intermediate Zoom Out Review Report (Stage 8)

**Target:** `D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md` (`Lines 1..400`)

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |

## Severity Breakdown
* 🔴 **Blockers:** 2
* 🟡 **Major Issues:** 2
* 🟢 **Nits:** 2

---

## Executive Summary

The Post-Critic remediations in `promotion_routing_and_banner_integration.md` successfully resolved several critical lower-level defects:
1. **Target Slug Denormalization** (`target_slug` in Section 5.3 & 5.4) properly eliminated the N+1 runtime query blocker for single product and category banner routing.
2. **Null-Safe SQL Quota Comparison** (`usage_limit IS NULL OR usage_count < usage_limit`) eliminated the fatal failure on unlimited promotions.
3. **URL Sanitization for Custom Destination** (Section 5.4) effectively eliminated the open-redirect and protocol-injection vulnerability.
4. **Timezone Standardization** (UTC vs MMT) and **Session Overwrite Protection** were correctly specified.

However, from an architectural **Zoom Out** perspective (examining system-level feasibility, codebase conventions, and architectural minimalism/YAGNI), **two critical blockers** and **two major design flaws** remain:
- **Supabase SDK Atomic Infeasibility & Split Order Ingress**: The document continues to prescribe raw SQL expressions for quota increments without specifying a PostgreSQL RPC function, despite `@supabase/supabase-js` lacking expression update capabilities. Furthermore, `D:/Pretty_Corner` lacks an `/api/orders` route and currently performs unvalidated direct client-side Supabase writes.
- **Compounding Stacking Paradox vs Single-Code UX**: The document introduces a complex 3-tier sequential compounding engine with weighted proration equations and margin clamping, yet the storefront UI, session storage, and order payload only support a **single active promo code**.
- **Orphaned Write-Time Stockout Logic**: The write-time stockout deactivation logic lacks restock re-enablement and is completely omitted from the Section 7.1 execution checklist.
- **Schema Redundancy**: A new `custom_destination` column was added despite `cta_link` already existing in the database and codebase.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Infeasible Supabase Atomic Increment & Split Storefront Ingress Seam - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Section 5.1 (Line 91), Section 5.9 (Lines 316-332), Section 7.1 Phase 5 (Lines 393-400)
* **Discrepancy Description**:
  The technical design specifies executing an atomic PostgreSQL conditional update inside `/api/orders`:
  ```sql
  UPDATE promotions
  SET usage_count = usage_count + 1
  WHERE id = $1 AND (usage_limit IS NULL OR usage_count < usage_limit);
  ```
  However:
  1. Both repositories (`D:/Pretty_Corner_Dashboard` and `D:/Pretty_Corner`) interact with PostgreSQL using `@supabase/supabase-js`. The Supabase JavaScript SDK does **not** support raw SQL arithmetic like `SET usage_count = usage_count + 1` via `.update()`. Performing this via standard `.update({ usage_count: existing + 1 })` introduces a severe read-modify-write race condition during concurrent checkouts.
  2. In `D:/Pretty_Corner`, there is currently **no `/api/orders` route** (`src/app/api/orders/route.ts` does not exist). In `StorefrontRepository.ts`, order creation attempts to POST to the Admin Dashboard API (`http://localhost:3001/api/orders`) and falls back to **direct client-side Supabase writes**.
  3. Direct client-side Supabase writes from the storefront bypass all server-side promo code validation, quota increments, and price re-checks unless PostgreSQL RLS or database triggers enforce them.
* **Rationale & Recommendation**:
  1. Define a Supabase PostgreSQL RPC function in the DDL migration:
     ```sql
     CREATE OR REPLACE FUNCTION increment_promotion_usage(p_id UUID)
     RETURNS BOOLEAN AS $$
     DECLARE
       rows_affected INTEGER;
     BEGIN
       UPDATE promotions
       SET usage_count = usage_count + 1
       WHERE id = p_id AND (usage_limit IS NULL OR usage_count < usage_limit);
       GET DIAGNOSTICS rows_affected = ROW_COUNT;
       RETURN rows_affected > 0;
     END;
     $$ LANGUAGE plpgsql;
     ```
     Execute this atomically in TypeScript via `await supabase.rpc('increment_promotion_usage', { p_id: promoId })`.
  2. Formally establish the order ingress route: implement `D:/Pretty_Corner/src/app/api/orders/route.ts` as the sole checkout ingress, and explicitly deprecate/remove direct client-side Supabase order insertion fallback in `StorefrontRepository.ts`.

---

### 2. Unresolved Compounding Stacking Paradox vs Single Promo Code Architecture - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Section 5.6 (Lines 262-265), Section 5.7 (Lines 272-295), Section 5.9 (Line 317)
* **Discrepancy Description**:
  Section 5.7 defines a complex 3-tier sequential compounding engine (Item $\to$ Category $\to$ Storewide) with weighted line-item proration equations, remainder distribution, and a 60% cumulative safety margin ceiling. However:
  1. The storefront UI, session state (`StoreContext.tsx`), browser storage (`pretty_corner_active_promo`), and order API payload (`{ items, promoCode: string }`) only support a **single active promo code**.
  2. Section 5.3 sets `redemption_method TEXT NOT NULL DEFAULT 'CODE'`. If all promotions require a voucher code, a customer can never enter or apply an Item code, a Category code, and a Storewide code simultaneously.
  3. The document does not define how automatic catalog promotions are retrieved, selected, or layered. Consequently, the 3-phase compounding pipeline, weighted proration formula, and 60% margin ceiling are speculative over-engineering (YAGNI secondary bloat) that cannot actually be exercised by the single-code UX and API schema.
* **Rationale & Recommendation**:
  Choose one of two architectural directions to eliminate this contradiction:
  - **Option A (Minimalist & Feasible - Strongly Recommended):** Align the pricing engine with the actual single-code model. Cart pricing evaluates: (1) Product Catalog Price (applying `salePrice` if present), and (2) Single Active Promotion Code (applying percentage discount to matching items if `SINGLE_PRODUCT`, `SELECTED_PRODUCTS`, or `CATEGORY`, or across eligible subtotal if `ENTIRE_STORE` with `minimum_order_amount`). Remove the 3-phase compounding pipeline, weighted line-item proration formulas, and arbitrary 60% margin ceiling.
  - **Option B (Full Multi-Tier Engine):** If true compounding is required, explicitly document:
    1. Catalog sale promotions as `redemption_method = 'AUTOMATIC'`, queried and applied automatically to items/categories in `StoreContext.tsx`.
    2. Storewide vouchers as `redemption_method = 'CODE'`, applied on top of the discounted line items at checkout.
    3. Update the order payload to pass `{ items, voucherCode, appliedPromotionIds: string[] }` so the server can re-verify all applied tiers.

---

### 3. Missing Implementation Tasks & Lack of Restock Re-enablement for Write-Time Stockout Detection - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Section 5.8 (Lines 304-312), Section 7.1 (Lines 360-400)
* **Discrepancy Description**:
  Section 5.8 specifies write-time stockout detection triggered during stock adjustments (`applyStockAdjustment`) and order confirmation, updating `is_out_of_stock = TRUE`. However:
  1. **Missing Restock Logic**: Section 5.8 only specifies setting `is_out_of_stock = TRUE` when inventory drops to zero. It fails to define the reverse transition: when inventory is restocked (`type === 'increase'`), `is_out_of_stock` must be reset to `FALSE`. Without bidirectional evaluation, restocked promotions remain permanently hidden.
  2. **Orphaned Execution Checklist**: In Section 7.1 (Unified Execution Checklist), there is **not a single task** assigned to update `adjustStock`, `executeOrderUpdate`, or inventory services in `D:/Pretty_Corner_Dashboard/src/lib/dev-store/` or `D:/Pretty_Corner`. The schema column and index are created in Phase 1, but the code to actually compute and set `is_out_of_stock` at write-time is completely missing from the plan.
* **Rationale & Recommendation**:
  1. In Section 5.8, specify bidirectional stock evaluation: when stock changes (decrease or increase), recalculate `is_out_of_stock` (`is_out_of_stock = NOT EXISTS (SELECT 1 FROM products WHERE ... AND stock > 0)`).
  2. Add explicit checklist items in Section 7.1 Phase 4 (`D:/Pretty_Corner_Dashboard/src/lib/dev-store/supabase-repository.ts` and `repository.ts`) to hook stock adjustments and order fulfillment into promotion stockout re-evaluation.

---

### 4. Schema Redundancy: `custom_destination` vs Existing `cta_link` - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Section 5.3 (Lines 166, 178), Section 5.4 (Lines 199, 205-214), Section 7.1 Phase 1 (Lines 366, 369)
* **Discrepancy Description**:
  Section 5.3 introduces a new database column `custom_destination TEXT DEFAULT NULL`. However, the Supabase schema and existing codebase already include `cta_link: string | null` in `promotions` (`SbPromotionRow` line 99, `Promotion` interface in `types.ts` line 83, and `HeroBannerSlider.tsx` line 145: `const ctaDestination = promo.ctaLink || '/shop';`).
  Adding `custom_destination` creates duplicate columns for identical semantics, creating schema bloat and developer confusion over which field takes precedence.
* **Rationale & Recommendation**:
  Remove `custom_destination` from the DDL and reuse the existing `cta_link` / `ctaLink` column. Update `resolvePromotionDestination` to accept `ctaLink?: string` (or alias `customDestination` to `ctaLink`). This avoids unnecessary schema migrations and preserves codebase conventions.

---

### 5. Relational Schema Drift: Missing `featured_product_ids` in Section 5.3 Data Dictionary & DDL - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Section 5.1 (Line 77), Section 5.2 (Line 144), Section 5.3 (Lines 158-185)
* **Discrepancy Description**:
  Section 5.2 line 144 mentions verifying `target_ids`, while Section 5.3 Data Dictionary and DDL omit any column for storing curated product sets for `SELECTED_PRODUCTS`. In existing codebase contracts (`admin.ts` and `types.ts`), this is represented by `featured_product_ids: string[]`.
* **Rationale & Recommendation**:
  Clarify in Section 5.3 that `SELECTED_PRODUCTS` utilizes the existing `featured_product_ids TEXT[]` column in Supabase, and replace stale references to `target_ids` in Section 5.2 with `featured_product_ids`.

---

### 6. Cross-Repository Test Runner Missing Dependency Isolation - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Section 7.1 Phase 2 (Line 375)
* **Discrepancy Description**:
  Section 7.1 Phase 2 introduces `D:/Pretty_Corner_Dashboard/scripts/test-promotion-architecture.mjs` to test destination routing and `CartEngine.ts`. However, `CartEngine.ts` and `resolvePromotionDestination.ts` reside in the storefront repository (`D:/Pretty_Corner/src/lib/`). A standalone Node script in the Dashboard repo trying to import TypeScript files directly from another repository will fail without ts-node/tsx or module resolution configuration.
* **Rationale & Recommendation**:
  Place unit tests for storefront pure modules (`resolvePromotionDestination.test.ts` and `CartEngine.test.ts`) directly within `D:/Pretty_Corner` using its standard test harness, or configure `test-promotion-architecture.mjs` with `tsx` to run isolated cross-package imports.

# Implementation Readiness Audit Report (Stage 9)

**Target:** `D:/Pretty_Corner_Dashboard/docs/designs/promotion_routing_and_banner_integration.md` (`Lines 359..400`, Section 7: Detailed Implementation Plan)

## Reviewer Status

| Reviewer | Lens / Standard | Status |
| :--- | :--- | :--- |
| `egm-implementation-readiness` | `implementation-readiness-standard` | completed |
| `egm-codebase-details` | `implementation-readiness-standard` | completed |
| `egm-style` | `technical-copy-editing` | completed |

## Severity Breakdown
* 🔴 **Blockers:** 3
* 🟡 **Major Issues:** 3
* 🟢 **Nits:** 2

---

## Executive Summary

The Implementation Readiness Audit conducted on Section 7 (Lines 359..400) reveals that while the architectural intent is solid, **the execution checklist is not yet ready for autonomous engineering execution**. An engineer attempting to execute this checklist today would be forced to invent critical mechanisms and make on-the-fly architectural decisions.

Specifically:
1. **Supabase Atomic RPC Omission**: Phase 1 lacks a database migration task for the DDL extensions and the PostgreSQL RPC function (`increment_promotion_usage`). Phase 5 prescribes a raw SQL `UPDATE` statement that cannot be executed directly via `@supabase/supabase-js`.
2. **Order Placement Ingress Seam & Insecure Fallback**: Phase 5 marks `src/app/api/orders/route.ts` as an existing file to "enhance", but this route **does not exist** in `D:/Pretty_Corner`. Furthermore, the checklist fails to address the architectural split where `StorefrontRepository.ts` falls back to unvalidated, direct client-side Supabase writes.
3. **Orphaned Write-Time Stockout & Restock Logic**: Section 5.8 specifies write-time stockout detection (`is_out_of_stock = TRUE`), but Section 7.1 contains **zero tasks** across `catalog-sync.ts`, `dev-store/repository.ts`, `supabase-repository.ts`, or `admin-store.tsx`. Moreover, neither Section 5.8 nor Section 7.1 accounts for restock re-enablement (`type === 'increase'`).
4. **Cross-Repository Test Runner Failure**: The test script `D:/Pretty_Corner_Dashboard/scripts/test-promotion-architecture.mjs` attempts to import TypeScript files directly from `D:/Pretty_Corner`, which fails under native Node ESM without a transpiler like `tsx` and violates repository boundary isolation.
5. **UI Target Mismatch & Zod Schema Drift**: Phase 3 targets `MobileShell.tsx` for cart summary breakdown instead of `src/app/bag/page.tsx`, and Phase 1 omits `CreateStorefrontOrderSchema` updates for promo code fields.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Missing Database Migration Task & PostgreSQL RPC Function for Atomic Quota Increment - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-implementation-readiness` / `egm-codebase-details`
* **Affected Scope:** Section 7.1 Phase 1 (Lines 365-371) & Phase 5 (Lines 393-400)
* **Discrepancy Description**:
  Section 5.3 defines the SQL DDL for table alterations, and Section 5.9 / Phase 5 specifies an atomic conditional update:
  ```sql
  UPDATE promotions
  SET usage_count = usage_count + 1
  WHERE id = $1 AND (usage_limit IS NULL OR usage_count < usage_limit);
  ```
  However:
  1. **Zero Migration Tasks in Phase 1**: Section 7.1 begins directly with TypeScript interfaces (`admin.ts`, `types.ts`) and Zod schemas. There is no checklist task to create or run a Supabase migration file (e.g., `D:/Pretty_Corner_Dashboard/supabase/migrations/20261123_promotions_and_rpc.sql`).
  2. **Infeasible JavaScript SDK Execution**: `@supabase/supabase-js` does not support raw SQL arithmetic in `.update()`. Invoking `.update({ usage_count: count + 1 })` from Node.js or browser runtimes introduces fatal read-modify-write race conditions under concurrent checkouts.
  3. An executing engineer must invent a PostgreSQL RPC function or fall back to an unsafe, non-atomic JavaScript read-then-write cycle.
* **Rationale & Recommendation**:
  - Add an explicit task to **Phase 1**:
    `* [ ] D:/Pretty_Corner_Dashboard/supabase/migrations/20261123_promotion_routing_and_rpc.sql (NEW): Create migration script defining DDL column alterations, compound indexes (idx_promotions_active_lookup), and the PostgreSQL atomic stored procedure increment_promotion_usage(p_id UUID). Rationale: Establishes database-level schema constraints and provides a concurrency-safe atomic increment primitive.`
  - Update **Phase 5** to replace the raw SQL snippet with the explicit Supabase client RPC invocation:
    `const { data: incremented, error } = await supabase.rpc('increment_promotion_usage', { p_id: promo.id });`

---

### 2. Ambiguous Ingress Seam, Missing File Tagging, and Insecure Client-Side Supabase Fallback in Order Placement - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-implementation-readiness` / `egm-codebase-details`
* **Affected Scope:** Section 7.1 Phase 5 (Lines 393-400)
* **Discrepancy Description**:
  Phase 5 states:
  `* [ ] D:/Pretty_Corner/src/lib/repository/StorefrontRepository.ts & src/app/api/orders/route.ts: Enhance order placement logic to authoritatively re-verify promotion eligibility...`
  This task contains three critical readiness defects:
  1. **Non-Existent File Labeled as Existing**: `D:/Pretty_Corner/src/app/api/orders/route.ts` **does not exist** in the repository. An engineer cannot "enhance" it without knowing whether to scaffold a Next.js App Router route handler from scratch.
  2. **Split Ingress Architecture Unresolved**: In `D:/Pretty_Corner/src/lib/repository/StorefrontRepository.ts` (lines 359–405), `createOrder` first attempts to POST to the Admin Dashboard API (`http://localhost:3001/api/orders`). If that fails, it silently executes direct client-side Supabase writes (`supabase.from('orders').insert(...)` and `supabase.from('order_items').insert(...)`).
  3. **Bypass of Server Validation**: If direct client-side Supabase writes remain in `StorefrontRepository.ts`, any client checkout that fails to connect to the API will bypass all promo code validation, quota increments, and server pricing checks. Furthermore, `D:/Pretty_Corner_Dashboard/src/app/api/orders/route.ts` (which currently processes storefront orders) is omitted from Phase 5.
* **Rationale & Recommendation**:
  - Split and specify the tasks in **Phase 5**:
    1. `* [ ] D:/Pretty_Corner/src/app/api/orders/route.ts (NEW): Create dedicated Next.js App Router POST handler in storefront. Validates cart payload, authoritatively re-executes calculatePricing against current catalog prices, verifies promo eligibility, executes increment_promotion_usage RPC, and inserts orders with service-role privileges. Rationale: Establishes local, zero-trust order processing for storefront customers.`
    2. `* [ ] D:/Pretty_Corner/src/lib/repository/StorefrontRepository.ts: Refactor createOrder to submit strictly to the local /api/orders route handler. Completely remove direct client-side Supabase insert fallback. Rationale: Eliminates client-side privilege escalation and guarantees every order passes authoritative validation.`
    3. `* [ ] D:/Pretty_Corner_Dashboard/src/app/api/orders/route.ts: Update admin order ingestion to validate promo code application and reflect discount amounts in admin order records.`

---

### 3. Omission of Write-Time Stockout and Restock Mutation Hooks - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-implementation-readiness` / `egm-codebase-details`
* **Affected Scope:** Section 5.8 (Lines 305-310), Section 7.1 Phase 4 (Lines 384-392)
* **Discrepancy Description**:
  Section 5.8 mandates write-time stockout detection: whenever stock adjustments occur or an order is confirmed, promotions linked to depleted products or categories must set `is_out_of_stock = TRUE`.
  However:
  1. **Completely Orphaned in Section 7.1**: The Unified Execution Checklist contains **zero tasks** updating the modules that execute inventory adjustments:
     - `D:/Pretty_Corner_Dashboard/src/modules/catalog/catalog-sync.ts` (`applyStockAdjustment`)
     - `D:/Pretty_Corner_Dashboard/src/lib/dev-store/repository.ts` (`adjustStock`, `createStorefrontOrder`, `updateOrder`)
     - `D:/Pretty_Corner_Dashboard/src/lib/dev-store/supabase-repository.ts` (`adjustStock`, `createStorefrontOrder`, `updateOrder`)
     - `D:/Pretty_Corner_Dashboard/src/context/admin-store.tsx` (`adjustStock`)
  2. **Missing Restock Re-enablement Logic**: Section 5.8 only specifies flipping `is_out_of_stock` to `TRUE`. It fails to specify the reciprocal transition: when an admin restocks inventory (`type === 'increase'`), `is_out_of_stock` must evaluate back to `FALSE`.
  Without actionable checklist items, `is_out_of_stock` will remain permanently `FALSE` upon row creation, or permanently `TRUE` once depleted, with no execution path to evaluate it.
* **Rationale & Recommendation**:
  - Add explicit checklist items in **Phase 4**:
    1. `* [ ] D:/Pretty_Corner_Dashboard/src/modules/catalog/catalog-sync.ts & dev-store/repository.ts: Implement reconcilePromotionStockout(productId: string) triggered during applyStockAdjustment, adjustStock, and order fulfillment. Evaluates stock levels bidirectionally (marking is_out_of_stock = TRUE on 0 inventory; reverting to FALSE on restock). Rationale: Delivers write-time promotion lifecycle maintenance required by Section 5.8.`
    2. `* [ ] D:/Pretty_Corner_Dashboard/src/lib/dev-store/supabase-repository.ts: Add Supabase query hook to update promotions.is_out_of_stock whenever products.stock_quantity changes.`

---

### 4. Cross-Repository Test Runner Dependency & Runtime Isolation Flaw - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness` / `egm-codebase-details`
* **Affected Scope:** Section 7.1 Phase 2 (Line 375)
* **Discrepancy Description**:
  Phase 2 specifies:
  `* [ ] D:/Pretty_Corner_Dashboard/scripts/test-promotion-architecture.mjs (NEW): Create an end-to-end Node.js test script asserting destination URL generation across all 4 tiers, 3-phase compounding mathematics...`
  1. The target modules being tested (`D:/Pretty_Corner/src/lib/promotion/resolvePromotionDestination.ts` and `D:/Pretty_Corner/src/lib/cart/CartEngine.ts`) reside inside the storefront repository (`D:/Pretty_Corner`), not the dashboard.
  2. A native Node ESM `.mjs` script in `D:/Pretty_Corner_Dashboard` cannot import TypeScript (`.ts`) modules from another folder without a runtime transpiler (such as `tsx` or `ts-node/esm`).
  3. Importing across repository workspaces couples independent build pipelines and will fail in isolated CI environments.
* **Rationale & Recommendation**:
  - Replace the cross-workspace `.mjs` script with dedicated unit test files inside the storefront repository's existing test structure:
    `* [ ] D:/Pretty_Corner/src/lib/promotion/__tests__/resolvePromotionDestination.test.ts (NEW): Unit tests for destination resolution, custom destination sanitization, and query parameter handling.`
    `* [ ] D:/Pretty_Corner/src/lib/cart/__tests__/CartEngine.test.ts: Unit tests asserting single-code discount calculations, category exclusions, and subtotal thresholds.`
  - If a top-level integration script is desired, explicitly specify execution via `npx tsx scripts/test-promotion-architecture.ts` and document cross-workspace path resolution.

---

### 5. UI Target Mismatch: Incorrect Component Specified for Storefront Cart Summaries - Severity: 🟡 Major
* **Reviewer Lens:** `egm-codebase-details` / `egm-implementation-readiness`
* **Affected Scope:** Section 7.1 Phase 3 (Line 382)
* **Discrepancy Description**:
  Phase 3 states:
  `* [ ] D:/Pretty_Corner/src/components/FloatingCartBar.tsx & src/components/MobileShell.tsx: Update cart summaries to display granular compounded savings line items. Rationale: Delivers full pricing transparency to customers before final order placement.`
  Inspection of `D:/Pretty_Corner/src/components/MobileShell.tsx` reveals that it is strictly an outer structural layout shell (rendering Header, Navigation, Footer, and FloatingCartBar). It has no cart state, no order items, and no pricing calculation logic.
  The actual storefront component displaying cart item lists, voucher input, subtotal, and discount lines is **`D:/Pretty_Corner/src/app/bag/page.tsx`**.
* **Rationale & Recommendation**:
  Update Phase 3 Line 382 to target the correct file:
  `* [ ] D:/Pretty_Corner/src/components/FloatingCartBar.tsx & D:/Pretty_Corner/src/app/bag/page.tsx: Update cart bar and bag page summaries to display promotion discount badge, applied coupon line item, and net savings. Rationale: Ensures customers see applied promotional savings in both the persistent floating bar and the dedicated shopping bag page.`

---

### 6. Missing Checkout Promo Code & Discount Fields in Dev-Store Zod Schemas - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness` / `egm-codebase-details`
* **Affected Scope:** Section 7.1 Phase 1 (Line 368) & Phase 5 (Lines 393-400)
* **Discrepancy Description**:
  Phase 1 specifies updating `PromotionSchema`, `CreatePromotionSchema`, and `UpdatePromotionSchema` in `D:/Pretty_Corner_Dashboard/src/lib/dev-store/schemas.ts`.
  However, `CreateStorefrontOrderSchema` (lines 115–133 of `schemas.ts`), which validates order submissions received by `/api/orders`, currently only accepts:
  `customerName`, `phone`, `township`, `deliveryAddress`, `items`, `subtotal`, `deliveryFee`, `total`, `paymentMethod`.
  It does **not** include `promoCode?: string`, `discount?: number`, or `appliedPromotionId?: string`.
  If an order payload containing promotional discount details is submitted, Zod validation will strip the fields or reject the request, preventing promotions from being processed or logged.
* **Rationale & Recommendation**:
  In Phase 1, expand line 368 to include:
  `Update CreateStorefrontOrderSchema in schemas.ts to include promoCode: z.string().optional(), discount: z.number().nonnegative().optional(), and appliedPromotionId: z.string().optional().`

---

### 7. Inconsistent File Path Syntax and Abbreviated Notation - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Section 7.1 Phase 3 (Line 382), Phase 4 (Line 391), Phase 5 (Line 394)
* **Discrepancy Description**:
  Section 7.1 mixes fully qualified absolute paths with abbreviated relative paths:
  - Line 382: `D:/Pretty_Corner/src/components/FloatingCartBar.tsx & src/components/MobileShell.tsx`
  - Line 391: `D:/Pretty_Corner_Dashboard/src/app/api/promotions/route.ts & [id]/route.ts`
  - Line 394: `D:/Pretty_Corner/src/lib/repository/StorefrontRepository.ts & src/app/api/orders/route.ts`
  Abbreviated paths hinder automated linting, script extraction, and create ambiguity across the two workspaces.
* **Rationale & Recommendation**:
  Format each file on an individual checklist line with its full absolute path:
  - `D:/Pretty_Corner_Dashboard/src/app/api/promotions/[id]/route.ts`
  - `D:/Pretty_Corner/src/app/api/orders/route.ts`
  - `D:/Pretty_Corner/src/app/bag/page.tsx`

---

### 8. Raw Uncontextualized SQL Snippet Inside Checklist Item - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Section 7.1 Phase 5 (Lines 395-399)
* **Discrepancy Description**:
  A 5-line raw SQL code block is nested directly inside a bullet item without specifying whether it represents an RPC function, a direct database query, or pseudo-code.
* **Rationale & Recommendation**:
  Remove the raw SQL snippet from the checklist task and replace it with direct engineering instructions referring to the RPC migration task defined in Phase 1.

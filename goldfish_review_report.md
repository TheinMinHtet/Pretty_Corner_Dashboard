# Goldfish Review Resolution Report: Stage 9 Implementation Readiness Remediation

**Target Document:** `docs/designs/promotion_routing_and_banner_integration.md`  
**Date:** 2026-11-23  
**Author:** MinnThikeTunn  
**Resolver:** Antigravity Architect  

---

## 1. Classification & Remediation Matrix

| Finding ID | Severity | Reviewer Lens | Finding Summary | Resolution Classification | Proposed Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | 🔴 Blocker | `egm-implementation-readiness` | Missing Supabase SQL migration file task and PostgreSQL RPC function for atomic increment | **PROPOSE FIX** | Add migration file task to Phase 1 (`supabase/migrations/20261123_promotions_and_rpc.sql`), embed `increment_promotion_usage(p_id UUID)` RPC in Section 5.3, and replace raw SQL in Section 5.9 / Phase 5 with `supabase.rpc('increment_promotion_usage', ...)`. |
| **F-02** | 🔴 Blocker | `egm-implementation-readiness` | Non-existent storefront order endpoint labeled as existing, and split ingress fallback allows client privilege bypass | **PROPOSE FIX** | Explicitly tag `D:/Pretty_Corner/src/app/api/orders/route.ts (NEW)` as a new file in Phase 5; refactor `StorefrontRepository.ts` to submit strictly to `/api/orders` and eliminate direct client-side Supabase order insertion fallback. |
| **F-03** | 🔴 Blocker | `egm-codebase-details` | Omission of write-time stockout and restock mutation hooks across inventory services | **PROPOSE FIX** | Add bidirectional stockout evaluation logic to Section 5.8 (`is_out_of_stock = FALSE` on restock; `TRUE` on depletion) and assign explicit tasks in Phase 4 to `catalog-sync.ts`, `repository.ts`, and `supabase-repository.ts`. |
| **F-04** | 🟡 Major | `egm-codebase-details` | Cross-repository test script importing TypeScript fails without runtime transpiler | **PROPOSE FIX** | Add dedicated in-repository unit tests inside `D:/Pretty_Corner/src/lib/promotion/__tests__/` and `src/lib/cart/__tests__/`, and configure `scripts/test-promotion-architecture.mjs` to run with `tsx`. |
| **F-05** | 🟡 Major | `egm-codebase-details` | UI target mismatch: `MobileShell.tsx` targeted instead of `src/app/bag/page.tsx` | **PROPOSE FIX** | Update Phase 3 to target `D:/Pretty_Corner/src/app/bag/page.tsx` for shopping bag discount badge, line-item savings, and coupon removal controls. |
| **F-06** | 🟡 Major | `egm-implementation-readiness` | Missing checkout promo code and discount fields in dev-store Zod schemas | **PROPOSE FIX** | Expand Phase 1 line to update `CreateStorefrontOrderSchema` in `schemas.ts` to include optional `promoCode: z.string().optional()` and `discount: z.number().nonnegative().optional()`. |
| **F-07** | 🟢 Nit | `egm-style` | Abbreviated and mixed relative/absolute file path notations | **PROPOSE FIX** | Normalize every file in Section 7.1 to its fully qualified path with clear `(NEW)` tags for net-new files. |
| **F-08** | 🟢 Nit | `egm-style` | Raw uncontextualized SQL snippet inside checklist bullet | **PROPOSE FIX** | Remove raw SQL snippet from Phase 5 checklist and replace with clean JavaScript RPC invocation referencing the migration defined in Phase 1. |
| **F-09** | 🟡 Major | `egm-zoom-out` | Schema redundancy (`custom_destination` vs `cta_link`) | **PROPOSE FIX** | Remove `custom_destination` from DDL and reuse existing `cta_link` column in Supabase and code. |

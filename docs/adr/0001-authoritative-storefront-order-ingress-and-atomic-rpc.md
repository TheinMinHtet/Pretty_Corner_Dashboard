# ADR 0001: Authoritative Storefront Order Ingress & PostgreSQL Atomic RPC

* **Status:** Accepted
* **Date:** 2026-11-23
* **Context:**
  Previously, the storefront (`D:/Pretty_Corner`) attempted to submit customer orders to an external admin dashboard endpoint (`http://localhost:3001/api/orders`) and silently fell back to direct client-side Supabase writes using anon credentials. Under concurrent checkouts and promotional campaigns, direct client writes cannot enforce server-authoritative discount validation or execute atomic quota increments without race conditions.
* **Decision:**
  1. Implement a dedicated local Next.js App Router endpoint `D:/Pretty_Corner/src/app/api/orders/route.ts` as the sole authoritative order ingress in the customer storefront.
  2. Deprecate and remove direct client-side Supabase order insertion fallbacks in `StorefrontRepository.ts`.
  3. Deploy a PostgreSQL stored procedure (`increment_promotion_usage(p_id UUID)`) in Supabase to atomically decrement/increment promotion redemptions inside the database transaction.
* **Consequences:**
  * **Positive:** Eliminates client-side price tampering, guarantees zero-trust financial integrity, and prevents race-condition over-redemption during flash sales.
  * **Negative:** Storefront orders now strictly require server route availability (no offline direct client database writes).

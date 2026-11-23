# Promotion Routing & Banner Integration (End-to-End Architecture)

* **Document Version:** 2.1 (Synthesized Concept Brief & Auto-Code Ingestion)
* **Target Feature:** Multi-Tier Promotion Routing, Automatic Coupon Ingestion, and Deterministic Stacking Engine
* **Authors:** MinnThikeTunn & EGM Swarm Synthesizer
* **Date:** 2026-11-23
* **Status:** Finalized Concept Brief

---

## 1. Executive Summary & Objective

An end-to-end promotional routing, automated deactivation, and discount stacking engine spanning both the administrative portal (`D:/Pretty_Corner_Dashboard`) and the customer storefront (`D:/Pretty_Corner`). The architecture establishes a strict separation between marketing banner navigation destinations and checkout discount eligibility across four target tiers (`SINGLE_PRODUCT`, `SELECTED_PRODUCTS`, `CATEGORY`, `ENTIRE_STORE`), while introducing frictionless automatic code application and server-validated checkout security.

Key capabilities delivered:
1. **Automated Destination Resolution**: Derives navigation URLs from promotion targets without manual link entry.
2. **Automated Multi-Factor Deactivation**: Automatically disables promotions on temporal expiry, usage limit exhaustion, or 100% inventory depletion (with graceful partial degradation for multi-item sets).
3. **Deterministic Sequential Compound Stacking**: Replaces flat single-discount cart logic with a 3-phase compounding calculation engine with a safety margin floor.
4. **Frictionless Automatic Code Ingestion & UX**: Banners automatically attach promotion codes to customer sessions; the cart drawer and checkout display pre-applied discounts with full visual transparency.
5. **Zero-Trust Authoritative Server Validation**: Prevents client-side price tampering by requiring the backend order pipeline to re-verify eligibility and recalculate totals from database records.

---

## 2. Core Invariants & Architectural Principles

### 2.1 The Decoupling Invariant: Destination vs Eligibility
```
Marketing Banner (Presentation & Auto-Code Attachment)
      │
      ▼
Destination Resolver (Navigation) ──► Storefront Page (/product, /promotions, /shop)
                                                      │ (User adds items)
                                                      ▼
Client Cart Engine (Optimistic UX) ──► Instant Visual Feedback & Pre-Filled Code
                                                      │ (User clicks Order)
                                                      ▼
Server-Side Pipeline (Authoritative Validation) ──► Atomic DB Verification & Pricing
```
* **Destination**: Where the customer lands when clicking a banner.
* **Auto-Code Ingestion**: Clicking a promotional banner attaches its coupon code into `StoreContext` and `sessionStorage`.
* **Zero-Trust Eligibility**: Client calculations are purely optimistic for UX. The backend server verifies promo validity, item eligibility, and pricing rules authoritatively before persisting the order.

---

## 3. Automatic Code Ingestion & UX Engine

### 3.1 Frictionless Application Flow
1. **Banner Interaction**:
   * When a customer clicks a hero banner or enters a promotional link (e.g. `/promotions/selected-beauty?code=PRETTY20` or `/product/dew-drop-serum?promo=DEW20`), the storefront registers the promotion code into `StoreContext` state and persists it to `sessionStorage`.
2. **Instant Visual Feedback**:
   * A non-intrusive notification pill appears: *"Code PRETTY20 applied — 20% off eligible products"*.
   * Eligible product cards on the shop and promotion listing pages render an active discount badge showing regular vs. promotional price.
3. **Cart & Checkout Display**:
   * Inside the cart drawer and checkout screen, the coupon input is pre-populated with the applied code and a green "Auto-Applied" badge.
   * Customers retain full control to remove the code or substitute a different voucher.

### 3.2 Security & Tamper-Proofing Architecture
* **Client Isolation**: The client passes only `{ items: [{ productId, size, quantity }], promoCode: string }` to `/api/orders`. Under no circumstances does the server accept a client-submitted `discountAmount` or pre-discounted `unitPrice`.
* **Database Re-Verification**:
  1. The server queries the database for the active promotion matching `code`.
  2. Verifies `is_active === true`, `starts_at <= now() <= ends_at`, and `usage_count < usage_limit`.
  3. Verifies that the cart items actually belong to the promotion's `target_ids`.
  4. Server calculates the discount using the pure `calculatePricing` logic and locks the total amount.
* **Concurrency Protection**:
  * The order creation transaction uses atomic SQL increments:
    ```sql
    UPDATE promotions
    SET usage_count = usage_count + 1
    WHERE id = $1 AND (usage_limit IS NULL OR usage_count < usage_limit);
    ```
  * If the update affects 0 rows, the transaction rolls back with a descriptive error code (`PROMOTION_LIMIT_REACHED`).

---

## 4. Target Tiers & Destination Resolution

| Target Tier (`target_type`) | Target Payload (`target_ids`) | Storefront Destination Route | Auto-Ingested Context |
| :--- | :--- | :--- | :--- |
| `SINGLE_PRODUCT` | `[productId]` | `/product/:productSlug` | Attaches single-product promo code to session |
| `SELECTED_PRODUCTS` | `[productId1, productId2, ...]` | `/promotions/:promotionSlug` | Attaches campaign promo code to session |
| `CATEGORY` | `[categorySlug]` | `/shop?category=:categorySlug` | Attaches category promo code to session |
| `ENTIRE_STORE` | `[]` (empty or null) | `/shop` | Attaches storewide voucher code to session |

### 4.1 Pure Resolver Function
```typescript
export function resolvePromotionDestination(promotion: {
  targetType: 'SINGLE_PRODUCT' | 'SELECTED_PRODUCTS' | 'CATEGORY' | 'ENTIRE_STORE';
  slug: string;
  code?: string;
  targetProductSlug?: string;
  targetCategorySlug?: string;
  customDestination?: string;
}): string {
  if (promotion.customDestination?.trim()) {
    return promotion.customDestination.trim();
  }

  const codeParam = promotion.code ? `?promo=${encodeURIComponent(promotion.code)}` : '';

  switch (promotion.targetType) {
    case 'SINGLE_PRODUCT':
      return promotion.targetProductSlug
        ? `/product/${promotion.targetProductSlug}${codeParam}`
        : `/shop${codeParam}`;

    case 'SELECTED_PRODUCTS':
      return `/promotions/${promotion.slug}${codeParam}`;

    case 'CATEGORY':
      return promotion.targetCategorySlug
        ? `/shop?category=${encodeURIComponent(promotion.targetCategorySlug)}${codeParam ? '&' + codeParam.slice(1) : ''}`
        : `/shop${codeParam}`;

    case 'ENTIRE_STORE':
    default:
      return `/shop${codeParam}`;
  }
}
```

---

## 5. Automated Deactivation & Graceful Degradation

A promotion transitions to inactive (`is_active = false`) or is dynamically excluded from customer views if any of the following conditions evaluate to true:

1. **Temporal Expiry**: Current timestamp $< \text{starts\_at}$ OR Current timestamp $> \text{ends\_at}$.
2. **Usage Exhaustion**: $\text{usage\_limit} > 0$ AND $\text{usage\_count} \ge \text{usage\_limit}$.
3. **Inventory Depletion & Partial Degradation**:
   * `SINGLE_PRODUCT`: Target product has `stock <= 0` or status $\neq$ `'Active'`. Promotion is hidden and de-activated.
   * `SELECTED_PRODUCTS`:
     * If some products sell out, the `/promotions/:slug` page stays live showing **only available in-stock items**.
     * When **100% of linked products** are out of stock or archived, the promotion is automatically disabled and hidden.
   * `CATEGORY`: Zero active, in-stock products exist under the linked category.

---

## 6. Promotion Stacking Engine (`CartEngine.ts`)

### 6.1 Sequential Compounding Model
Discounts compound sequentially rather than additively to protect merchant margins:

$$\text{Phase 1: Line-Item Discount} \longrightarrow \text{Phase 2: Category Discount} \longrightarrow \text{Phase 3: Storewide / Voucher Discount}$$

#### Mathematical Formulation:
1. **Phase 1 (Item Level)**: For line item $i$ with original price $P_i$ and quantity $Q_i$:
   $$P_{i, 1} = \text{round}\left(P_i \times \left(1 - \frac{d_{item}}{100}\right)\right)$$
2. **Phase 2 (Category Level)**: Applied to the already reduced price $P_{i, 1}$:
   $$P_{i, 2} = \text{round}\left(P_{i, 1} \times \left(1 - \frac{d_{cat}}{100}\right)\right)$$
3. **Phase 3 (Storewide / Coupon Level)**:
   $$S_{net} = \sum_i (P_{i, 2} \times Q_i)$$
   $$\text{Discount}_{store} = \text{round}\left(S_{net} \times \frac{d_{store}}{100}\right)$$
4. **Safety Ceiling Clamp**:
   * Total compound discount per item cannot exceed 60% of original price $P_i$ to prevent catastrophic margin collapse.

---

## 7. Phased Implementation Roadmap

1. **Phase 1: Shared Data Model & Schema Migration**
   * Extend `promotions` table with `slug`, `target_type`, `target_ids`, `redemption_method`, `usage_limit`.
   * Update TypeScript types in both `D:/Pretty_Corner_Dashboard` and `D:/Pretty_Corner`.
2. **Phase 2: Pure Logic Engine & Stacking Unit Tests**
   * Implement `resolvePromotionDestination` and multi-tier `CartEngine.ts`.
   * Implement URL promo parameter parser and `sessionStorage` sync hook.
3. **Phase 3: Admin Configuration Portal (`D:/Pretty_Corner_Dashboard`)**
   * Target tier selector (`SINGLE_PRODUCT`, `SELECTED_PRODUCTS`, `CATEGORY`, `ENTIRE_STORE`).
   * Live destination URL preview.
   * Usage limit and deactivation triggers.
4. **Phase 4: Storefront Experience (`D:/Pretty_Corner`)**
   * Hero banner destination linking with auto-ingested query parameters.
   * Dynamic `/promotions/[slug]/page.tsx` with async params and graceful empty/fallback states.
   * Auto-applied discount feedback badges in cart and checkout.
5. **Phase 5: Authoritative Server Pipeline & Security Validation**
   * Server-side revalidation of pricing and coupon codes inside order submission API.
   * Atomic usage count updates and race condition prevention.

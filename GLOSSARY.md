# Pretty Corner Domain Glossary

### Promotion
A commercial marketing rule defining discount percentages, temporal validity windows, redemption quotas, and targeted catalog scopes.

### Target Tier
The scope of catalog products eligible for a promotion's discount. Classified into four mutually exclusive tiers:
* **Single Product (`SINGLE_PRODUCT`)**: Exactly one specific catalog product.
* **Selected Products (`SELECTED_PRODUCTS`)**: A curated set of multiple specific catalog products.
* **Category (`CATEGORY`)**: All products belonging to a designated catalog category.
* **Entire Store (`ENTIRE_STORE`)**: All active products across the entire catalog.

### Destination Route
The customer-facing URL where shoppers land after clicking a promotional hero banner. Derived deterministically from the promotion's Target Tier, decoupling browsing navigation from cart eligibility.

### Promotion Hub
A dynamic storefront route (`/promotions/:slug`) designed to showcase the curated product set of an active `SELECTED_PRODUCTS` promotion, featuring campaign headers, countdown timers, and live stock statuses.

### Auto-Ingested Coupon
A promotional voucher code automatically captured into customer session state and browser storage (`sessionStorage`) upon clicking a marketing banner or arriving via a campaign URL parameter (`?promo=CODE`), eliminating manual code typing during checkout.

### Stockout State (`is_out_of_stock`)
A write-time operational status flag indicating whether 100% of products linked to a promotion have zero available stock. Automatically updated during stock adjustments and order confirmations.

### Usage Quota (`usage_limit`)
The maximum global number of times a promotional code may be redeemed across all customers before the promotion automatically deactivates.

### Authoritative Order Ingress
The dedicated server-side API endpoint (`D:/Pretty_Corner/src/app/api/orders/route.ts`) responsible for validating cart pricing, verifying promotion rules, executing atomic database quota increments via PostgreSQL RPC, and creating order records using service-role permissions.

### Quota Restoration
The operational process of decrementing `usage_count` on a promotion when an order utilizing that promotional code is marked as `Cancelled` or `Refunded` in the administration dashboard.

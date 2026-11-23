# Promotion Routing & Banner Integration

## Implementation Specification for Pretty Corner

**Document type:** Feature implementation brief\
**Audience:** AI coding agent\
**Project:** Pretty Corner e-commerce\
**Status:** Proposed implementation

------------------------------------------------------------------------

## 1. Objective

Implement a promotion system in which each homepage promotion banner
directs customers to the most relevant shopping destination based on the
promotion's target.

The system must distinguish between:

1.  **Promotion eligibility** --- which cart products qualify for the
    discount.
2.  **Promotion destination** --- where the customer goes after clicking
    the banner.

These are separate concerns. A destination must never determine discount
eligibility.

The implementation should fit the existing Pretty Corner application and
reuse its current product detail and category routes wherever possible.

## 2. Promotion target types and default destinations

Support the following target types:

  --------------------------------------------------------------------------------
  Target type             Meaning                 Default customer destination
  ----------------------- ----------------------- --------------------------------
  `SINGLE_PRODUCT`        One specific product    `/product/:slug`

  `SELECTED_PRODUCTS`     A manually selected set `/promotions/:promotionSlug`
                          of products             

  `CATEGORY`              Products belonging to   `/shop?category=:categorySlug`
                          one or more selected    
                          categories              

  `ENTIRE_STORE`          All eligible products   `/shop`
                          in the store            
  --------------------------------------------------------------------------------

### 2.1 Single product

Example: 20% off Dew Drop Serum.

-   The admin selects one product.
-   The banner CTA navigates to that product's detail page.
-   Use the product's existing slug and existing product detail route.
-   The product detail page should display the promotion when the
    product is eligible and the promotion is active.

Example route:

``` text
/product/dew-drop-serum
```

### 2.2 Selected products

Example: 20% off selected beauty products.

-   The admin selects multiple products.
-   The banner CTA navigates to a promotion-specific product listing
    page.
-   The page dynamically displays the products attached to that
    promotion.
-   Do not create a hardcoded page for each promotion.
-   The page should use the existing product-card and product-listing UI
    patterns where possible.

Example route:

``` text
/promotions/selected-beauty
```

The promotion page should: - Load the promotion using its slug. - Show
the promotion title, description and applicable offer. - List only
products included in the promotion and currently available for sale. -
Link each product card to its normal product detail page. - Show
discount information on eligible products. - Handle invalid, inactive or
expired promotion slugs gracefully.

### 2.3 Category

Example: 15% off all Makeup products.

-   The admin selects a category.
-   The banner CTA navigates to the existing category-filtered shop
    page.
-   Reuse the existing category query parameter and filtering behavior.
-   Eligible products should show their promotion price or discount
    badge.

Example route:

``` text
/shop?category=makeup
```

The current Pretty Corner shop already uses category query parameters,
for example:

``` text
/shop?category=makeup
/shop?category=lenses
```

Preserve this behavior rather than creating separate category pages.

### 2.4 Entire store

Example: 10% off the entire store.

-   The banner CTA navigates to the main shop page.
-   The promotion applies only to products that satisfy the promotion's
    eligibility rules.
-   If exclusions are supported, excluded products must not receive the
    discount even though the destination is the full shop.

Example route:

``` text
/shop
```

## 3. Admin configuration behavior

When an admin creates or edits a promotion, provide a target-type
selector:

-   Single product
-   Selected products
-   Category
-   Entire store

Show the relevant selection control based on the chosen target:

  -----------------------------------------------------------------------
  Target                              Admin selection control
  ----------------------------------- -----------------------------------
  `SINGLE_PRODUCT`                    Select one product

  `SELECTED_PRODUCTS`                 Select one or more products

  `CATEGORY`                          Select one or more categories (if
                                      supported by the existing data
                                      model)

  `ENTIRE_STORE`                      No product/category selector
                                      required
  -----------------------------------------------------------------------

### 3.1 Destination configuration

By default, automatically determine the destination from the target
type:

  Target                Default destination type
  --------------------- --------------------------
  `SINGLE_PRODUCT`      `PRODUCT_DETAIL`
  `SELECTED_PRODUCTS`   `PROMOTION_LISTING`
  `CATEGORY`            `CATEGORY_PAGE`
  `ENTIRE_STORE`        `SHOP_PAGE`

The admin UI should display the generated destination as a preview.

Optional future capability: allow an admin to override the default
destination with a validated custom landing page. Do not make arbitrary
URL entry necessary for the initial implementation.

### 3.2 Banner fields

Keep banner presentation content separate from promotion rules. A banner
may contain:

-   Title
-   Subtitle or description
-   Image
-   CTA label
-   Linked promotion
-   Display status
-   Display order, if the existing banner system supports ordering

A banner should reference a promotion rather than duplicating its
discount rules.

This allows the banner artwork or wording to change without changing the
promotion's eligibility rules.

## 4. Data model guidance

Adapt these fields to the project's existing database conventions. Do
not create duplicate product, category or promotion models if equivalent
models already exist.

### 4.1 Promotion

Suggested conceptual fields:

``` json
{
  "id": "promotion_id",
  "name": "Selected Beauty Weekend",
  "slug": "selected-beauty",
  "code": "PRETTY20",
  "discount_type": "PERCENTAGE",
  "discount_value": 20,
  "target_type": "SELECTED_PRODUCTS",
  "target_ids": ["product_id_1", "product_id_2"],
  "redemption_method": "CODE",
  "minimum_order_amount": null,
  "minimum_quantity": null,
  "usage_limit": 100,
  "per_customer_limit": 1,
  "starts_at": "2026-11-21T00:00:00",
  "ends_at": "2026-11-30T23:59:59",
  "status": "ACTIVE"
}
```

This is an illustrative shape, not a requirement to copy the exact
schema.

For `target_ids`: - `SINGLE_PRODUCT`: one product ID. -
`SELECTED_PRODUCTS`: selected product IDs. - `CATEGORY`: selected
category IDs. - `ENTIRE_STORE`: empty or null, according to project
conventions.

If the project uses relational tables, use appropriate join tables for
multiple selected products/categories rather than storing arrays in a
relational column.

### 4.2 Banner

Suggested conceptual fields:

``` json
{
  "id": "banner_id",
  "title": "Lash & Lip Weekend",
  "description": "Enjoy 20% off selected beauty products",
  "image": "banner-image-reference",
  "cta_label": "Explore Offers",
  "promotion_id": "promotion_id",
  "is_active": true,
  "display_order": 1
}
```

The banner references the promotion. It should not independently define
discount amount, eligible products or validity dates.

### 4.3 Destination resolution

Prefer deriving the default destination from the promotion target
instead of persisting a URL that can become stale.

Conceptual resolver:

``` ts
function resolvePromotionDestination(promotion) {
  switch (promotion.targetType) {
    case "SINGLE_PRODUCT":
      return `/product/${promotion.product.slug}`;

    case "SELECTED_PRODUCTS":
      return `/promotions/${promotion.slug}`;

    case "CATEGORY":
      return `/shop?category=${promotion.category.slug}`;

    case "ENTIRE_STORE":
      return "/shop";

    default:
      return "/shop";
  }
}
```

Adapt the property names and routing conventions to the actual project.
If multiple categories are supported, define a clear landing-page
behavior rather than assuming one category slug.

Do not trust a destination supplied by an untrusted client request.

## 5. Customer-facing behavior

### 5.1 Homepage banner

When a customer clicks a promotion banner:

1.  Identify the banner's linked promotion.
2.  Resolve the destination using the promotion target.
3.  Navigate to the appropriate page.
4.  Preserve the existing responsive banner and carousel behavior.

### 5.2 Promotion listing page

For `/promotions/:promotionSlug`:

-   Fetch the promotion by slug.
-   Verify that it is published/active and within its validity period
    before presenting it as an active offer.
-   Retrieve the selected products associated with it.
-   Display the promotion heading and offer information.
-   Reuse existing product cards, sorting and responsive layout where
    practical.
-   Hide unavailable or unpublished products, following existing shop
    behavior.
-   Show a useful not-found or unavailable state for invalid/inactive
    promotions.

If the current application does not have a promotion listing page,
implement a reusable dynamic page rather than a page specific to one
campaign.

### 5.3 Product and category pages

Where a product is eligible for an active promotion:

-   Show a clear promotion badge.
-   Show the original price and discounted price when appropriate.
-   Keep the normal product detail and add-to-bag flow.
-   Do not assume that reaching the page means the discount has already
    been applied to the order.

For category pages, show the offer only on products that actually
qualify.

### 5.4 Entire-store promotion

The `/shop` page should remain the normal shop page. Eligible products
may show promotion badges/prices, but the promotion must still be
validated when the customer applies a code or checks out.

## 6. Discount eligibility and checkout validation

This is a critical requirement:

**The banner destination and the promotion target are independent. The
backend must calculate and validate discounts using promotion rules and
the actual cart.**

When a customer applies a promo code or the system evaluates an
automatic discount, validate at least:

1.  The promotion exists.
2.  The promotion is active and published.
3.  The current time is within its start/end dates.
4.  The code matches, when code redemption is required.
5.  The promotion usage limit has not been exceeded.
6.  The customer has not exceeded their personal usage limit, if
    configured.
7.  The cart contains eligible products.
8.  Minimum order amount and/or quantity conditions are satisfied.
9.  Excluded products are not discounted.
10. The resulting discount does not exceed the eligible subtotal.

The backend must calculate the discount. Never trust a discount amount
or final total sent by the frontend.

Revalidate the promotion when the order is submitted. Record or reserve
redemptions safely and atomically when an order is confirmed, so
concurrent requests cannot exceed usage limits.

If a promotion is invalid, return a clear, customer-friendly error and
do not apply the discount.

## 7. Redemption methods

The promotion model should be able to support:

-   `CODE`: customer enters a promo code at checkout.
-   `AUTOMATIC`: system applies the discount when cart conditions are
    met.

If the current checkout does not support both methods, implement the
method already supported by the project first and keep the model
extensible.

Copying a code from a banner is only a convenience. Copying must not
itself apply the discount.

## 8. Acceptance criteria

The implementation is complete when all applicable criteria pass:

### Routing

-   [ ] A single-product promotion banner navigates to the selected
    product detail page.
-   [ ] A selected-products promotion banner navigates to
    `/promotions/:promotionSlug`.
-   [ ] The promotion listing page displays only the promotion's
    selected eligible products.
-   [ ] A category promotion banner navigates to the existing
    `/shop?category=:slug` route.
-   [ ] An entire-store promotion banner navigates to `/shop`.
-   [ ] Existing category routes and shop filtering continue to work.
-   [ ] Invalid or unavailable promotion destinations show a graceful
    state.
-   [ ] Banner links work on desktop and mobile.

### Admin

-   [ ] Admin can select the promotion target type.
-   [ ] The appropriate product/category selection control appears for
    the chosen target.
-   [ ] The default destination is generated from the target type.
-   [ ] Admin can preview the destination.
-   [ ] Banner content references a promotion instead of duplicating
    discount rules.
-   [ ] Changing banner artwork does not change promotion eligibility.

### Discount correctness

-   [ ] Discounts are validated and calculated on the backend.
-   [ ] Products outside the target do not receive the discount.
-   [ ] Expired, inactive and exhausted promotions cannot be redeemed.
-   [ ] Minimum purchase and usage restrictions are enforced when
    configured.
-   [ ] Frontend-submitted discount amounts are never trusted.
-   [ ] Checkout revalidates the promotion before order confirmation.

### Customer experience

-   [ ] Eligible products visibly indicate the promotion.
-   [ ] Original and discounted prices are presented clearly.
-   [ ] Customers receive understandable feedback when a code is
    invalid.
-   [ ] Customers can continue through the existing bag and checkout
    process.

## 9. Implementation constraints for the coding agent

Before changing code:

1.  Inspect the existing repository structure, routing framework,
    product/category models, banner implementation, cart and checkout
    flow, and admin promotion-related components.
2.  Identify existing routes and reuse them. The known shop routes
    include `/shop`, `/shop?category=makeup`, `/shop?category=lenses`,
    and product detail routes such as `/product/:slug`; verify these
    against the current code.
3.  Identify whether a promotion model or discount logic already exists.
    Extend it instead of creating competing implementations.
4.  Follow existing naming, styling, API, validation and error-handling
    conventions.
5.  Keep frontend display logic separate from authoritative backend
    discount validation.
6.  Do not break existing product detail, category filtering, bag or
    checkout behavior.
7.  Add or update tests for destination resolution, target eligibility,
    promotion listing, and checkout validation.
8.  Do not invent API endpoints or database fields without first
    checking the existing architecture.

### Suggested implementation order

1.  Audit existing code and document the relevant components/routes/data
    models.
2.  Implement or adapt promotion target types and destination
    resolution.
3.  Connect homepage banners to the resolved destinations.
4.  Implement the reusable `/promotions/:promotionSlug` listing page.
5.  Add promotion indicators to eligible product cards/detail pages.
6.  Integrate or verify backend checkout eligibility and discount
    calculation.
7.  Add tests and verify existing shop/cart flows.

## 10. Important design principle

Keep these concepts independent:

``` text
Promotion
  ├── Discount rules
  ├── Target / eligibility
  ├── Validity and usage limits
  └── Redemption method

Promotion Banner
  ├── Marketing title and description
  ├── Artwork
  ├── CTA label
  └── Linked promotion
          |
          v
    Destination resolver
          |
          v
    Product / Promotion listing / Category / Shop
```

The goal is a reusable promotion engine, not four hardcoded banner
behaviors. The system should allow the business to create new campaigns
through admin configuration without requiring developers to add a new
page or route for every campaign.

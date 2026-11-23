# Pretty Corner E-Commerce & Admin — Comprehensive Database Design Document & ERD

**System:** Pretty Corner E-Commerce Platform & Admin Back-Office  
**Specification Reference:** [docs/Pretty_Corner_Feature_Specification_v1.0.docx](file:///D:/Pretty_Corner_Dashboard/docs/Pretty_Corner_Feature_Specification_v1.0.docx)  
**Document Version:** 3.0 (Comprehensive Normalized Production Model)  
**Target Database:** PostgreSQL 16+ (Supabase / Managed Relational Store)  
**Date:** 2026-11-21  

---

## 1. Executive Summary

This document specifies the enterprise-grade relational database architecture and Entity-Relationship (ER) model for the complete **Pretty Corner** e-commerce ecosystem.

### Architectural Pillars & Domain Principles
1. **Guest Checkout & Customer Unification (`PC-OS-009`, `PC-CM-007`):** Shoppers browse and buy as guests without mandatory registration. Profiles and historical metrics are consolidated by unique normalized phone numbers (`E.164` / Myanmar telecom format).
2. **Immutable Historical Financial Snapshots (`PC-OM-010`):** Invoices and line items freeze point-in-time product names, SKUs, variant attributes, and unit prices. Editing, repricing, or archiving a product never alters past financial reports.
3. **Immutable Delivery Address Snapshots (`PC-OM-006`, Sec 6):** An order captures a frozen snapshot (`ORDER_DELIVERY_ADDRESS`) including GPS coordinates, building details, and landmarks. Subsequent modifications to the customer's default address book do not corrupt historical fulfillment records.
4. **Physical In-Store Pickup (`PC-AD-004`, `OD-04`):** When `delivery_method = 'pickup'`, the order links directly to a configured `STORE_PICKUP_LOCATION` specifying branch hours, address, and collection instructions.
5. **Concurrent Purchase Protection & Temporary Stock Hold (`PC-IS-009`, `OD-08`, Sec 7.3):** A dedicated `STOCK_RESERVATION` ledger temporarily holds items (15-minute TTL) during the MyanMyanPay payment session. If payment fails or expires, the reservation automatically releases back to available stock.
6. **Multi-Image Asset Management (`PC-PM-004`):** Normalized `PRODUCT_IMAGE` entity manages multiple galleries, sort orders, and CDN/storage URLs without bloating rows with base64 data.
7. **Promotion Many-to-Many Scoping (`PC-CT-003`):** Scoped discounts link to specific eligible products via the `PROMOTION_PRODUCT` junction table.
8. **Double-Entry Inventory Audit Ledger (`PC-IS-008`, `PC-IS-004`):** Every stock mutation (sales, cancellations, restocks, damage) is recorded with before/after counts, timestamps, and actor identifiers.
9. **Hierarchical Taxonomy (`PC-PM-005`):** `CATEGORY` features self-referential parent/child relationships (`parent_category_id`) for multi-level navigation.
10. **Secure Guest Tracking (`PC-OM-007`, `OD-07`):** `ORDER_LOOKUP_TOKEN` enables customers to track order fulfillment using reference and phone verification without exposing customer PII.

---

## 2. Comprehensive Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    ADMIN_USER ||--o{ AUDIT_LOG : records
    ADMIN_USER ||--o{ INVENTORY_ADJUSTMENT : executes
    ADMIN_USER ||--o{ REFUND_RECORD : authorizes

    CUSTOMER ||--o{ CUSTOMER_ADDRESS : maintains
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ SHOPPING_CART : owns
    CUSTOMER ||--o{ WISHLIST : maintains
    
    CUSTOMER_ADDRESS }o--|| DELIVERY_ZONE : located_in

    CATEGORY ||--o{ CATEGORY : parent_of
    CATEGORY ||--o{ PRODUCT : categorizes

    PRODUCT ||--|{ PRODUCT_IMAGE : displays
    PRODUCT ||--o{ PRODUCT_VARIANT : contains
    PRODUCT ||--o{ ORDER_ITEM : ordered_in
    PRODUCT ||--o{ CART_ITEM : in_cart
    PRODUCT ||--o{ WISHLIST_ITEM : in_wishlist
    PRODUCT ||--o{ INVENTORY_ADJUSTMENT : tracks
    PRODUCT ||--o{ STOCK_RESERVATION : reserves
    PRODUCT ||--o{ PROMOTION_PRODUCT : discounts_under
    
    PRODUCT_VARIANT ||--o{ ORDER_ITEM : specifies
    PRODUCT_VARIANT ||--o{ CART_ITEM : specifies_cart
    PRODUCT_VARIANT ||--o{ WISHLIST_ITEM : specifies_wishlist
    PRODUCT_VARIANT ||--o{ INVENTORY_ADJUSTMENT : tracks_variant
    PRODUCT_VARIANT ||--o{ STOCK_RESERVATION : reserves_variant

    SHOPPING_CART ||--|{ CART_ITEM : contains
    WISHLIST ||--|{ WISHLIST_ITEM : contains

    ORDER ||--|| ORDER_DELIVERY_ADDRESS : delivers_to
    ORDER ||--o| STORE_PICKUP_LOCATION : collects_at
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER ||--o{ ORDER_TIMELINE : logs
    ORDER ||--o{ PAYMENT_TRANSACTION : settles
    ORDER ||--o| REFUND_RECORD : generates
    ORDER ||--o{ INVENTORY_ADJUSTMENT : triggers
    ORDER ||--o{ STOCK_RESERVATION : fulfills
    ORDER ||--o{ ORDER_LOOKUP_TOKEN : authorizes_lookup
    ORDER }o--o| PROMOTION : discounts_with

    BANNER }o--o| PROMOTION : links_to
    PROMOTION ||--o{ PROMOTION_PRODUCT : applies_to

    NOTIFICATION }o--o| ORDER : relates_to
    NOTIFICATION }o--o| PRODUCT : alerts_on

    ADMIN_USER {
        uuid id PK
        varchar email UK "Admin login email"
        varchar password_hash "Argon2id or bcrypt hash"
        varchar full_name "Staff display name"
        varchar role "Owner or Staff (RBAC)"
        varchar phone "Contact number"
        boolean is_active "Account status flag"
        timestamp last_login_at "Last authenticated session"
        timestamp created_at "Created timestamp"
        timestamp updated_at "Updated timestamp"
    }

    CUSTOMER {
        uuid id PK
        varchar phone UK "Normalized primary phone (e.g. +959...)"
        varchar name "Customer full name from checkout"
        varchar email "Optional customer email"
        int total_orders "Aggregated lifetime order count"
        decimal lifetime_spend "Aggregated MMK spend excluding cancellations"
        timestamp first_order_at "First purchase timestamp"
        timestamp last_order_at "Most recent purchase timestamp"
        timestamp created_at "First interaction timestamp"
        timestamp updated_at "Profile last modified"
    }

    DELIVERY_ZONE {
        uuid id PK
        varchar city "City (e.g. Yangon, Mandalay)"
        varchar township_name UK "Township name (e.g. Bahan, Kamayut)"
        decimal standard_delivery_fee "Base delivery charge (MMK)"
        int estimated_delivery_days "Standard transit SLA in business days"
        boolean is_active "Operational delivery coverage flag"
        timestamp updated_at "Fee rate modification timestamp"
    }

    CUSTOMER_ADDRESS {
        uuid id PK
        uuid customer_id FK "Owning customer"
        uuid delivery_zone_id FK "Matched delivery zone"
        varchar recipient_name "Delivery recipient name"
        varchar phone "Recipient contact phone"
        text street_address "Street and home address"
        varchar township "Township name"
        varchar city "City name"
        varchar building "Building / Apartment / Floor number"
        varchar nearby_landmark "Visual reference landmark for rider dispatch"
        decimal latitude "GPS Latitude (WGS 84)"
        decimal longitude "GPS Longitude (WGS 84)"
        text delivery_instructions "Rider notes and instructions"
        boolean is_default "Default address selector"
        timestamp created_at "Created timestamp"
    }

    STORE_PICKUP_LOCATION {
        uuid id PK
        varchar store_name "Branch or store name"
        text address "Physical storefront address"
        varchar township "Township name"
        varchar city "City name"
        varchar contact_phone "Store contact telephone"
        varchar operating_hours "Collection hours (e.g. 9 AM - 6 PM)"
        text instructions "Customer pickup guidance"
        boolean is_active "Active location toggle"
        timestamp created_at "Created timestamp"
        timestamp updated_at "Updated timestamp"
    }

    CATEGORY {
        uuid id PK
        uuid parent_category_id FK "Self-referencing parent category"
        varchar name "Category name"
        varchar slug UK "URL-friendly unique slug"
        text description "Category description"
        varchar image_url "Category cover image"
        boolean is_active "Display on storefront"
        int display_order "Sorting order weight"
        timestamp created_at "Created timestamp"
        timestamp updated_at "Updated timestamp"
    }

    PRODUCT {
        uuid id PK
        uuid category_id FK "Foreign key to Category"
        varchar name "Product commercial title"
        varchar slug UK "URL slug for storefront routing"
        text description "Detailed product description"
        varchar brand "Brand or manufacturer"
        varchar sku UK "Base SKU code"
        decimal regular_price "Standard retail price (MMK)"
        decimal sale_price "Optional promotional price (MMK)"
        int stock "Total physical sellable stock"
        int low_stock_threshold "Alert threshold count"
        varchar status "Active, Draft, Archived"
        boolean is_contact_lens "Flag indicating optical lens attributes"
        int sold_count "Total units fulfilled"
        timestamp created_at "Catalog entry timestamp"
        timestamp updated_at "Last updated timestamp"
    }

    PRODUCT_IMAGE {
        uuid id PK
        uuid product_id FK "Parent product"
        varchar image_url "Storage URL or CDN path"
        varchar alt_text "Accessible description"
        int display_order "Visual sequence order"
        boolean is_primary "Hero image indicator"
        timestamp created_at "Uploaded timestamp"
    }

    PRODUCT_VARIANT {
        uuid id PK
        uuid product_id FK "Parent product"
        varchar label "Variant title (e.g. Gray -1.50, #02 Berry)"
        varchar sku UK "Variant-specific SKU"
        varchar color "Color hex or color name"
        varchar lens_power "Optical power (diopter -0.50 to -8.00)"
        decimal base_curve "Lens base curve (e.g. 8.6mm)"
        decimal diameter "Lens diameter (e.g. 14.2mm)"
        decimal water_content "Lens water content percentage"
        varchar duration "Daily, Monthly, 1 Year"
        int quantity "Variant-specific available inventory"
        decimal price_override "Optional variant-specific price (MMK)"
        timestamp created_at "Creation timestamp"
        timestamp updated_at "Last updated timestamp"
    }

    STOCK_RESERVATION {
        uuid id PK
        uuid product_id FK "Target product"
        uuid variant_id FK "Target variant (nullable)"
        uuid order_id FK "Associated order once created"
        varchar session_token "Guest browser session token"
        int quantity "Reserved quantity"
        varchar status "Active, Consumed, Released, Expired"
        timestamp expires_at "Reservation TTL (e.g. 15 minutes)"
        timestamp created_at "Reservation timestamp"
    }

    SHOPPING_CART {
        uuid id PK
        varchar session_token UK "Anonymous guest browser session cookie"
        uuid customer_id FK "Optional linked customer"
        timestamp expires_at "Cart retention period"
        timestamp updated_at "Last modified timestamp"
    }

    CART_ITEM {
        uuid id PK
        uuid cart_id FK "Owning shopping cart"
        uuid product_id FK "Selected product"
        uuid variant_id FK "Selected variant (nullable)"
        int quantity "Cart quantity"
        timestamp created_at "Created timestamp"
    }

    WISHLIST {
        uuid id PK
        varchar session_token UK "Anonymous guest session token"
        uuid customer_id FK "Optional registered customer"
        timestamp updated_at "Last modified timestamp"
    }

    WISHLIST_ITEM {
        uuid id PK
        uuid wishlist_id FK "Owning wishlist"
        uuid product_id FK "Saved product"
        uuid variant_id FK "Saved variant (nullable)"
        timestamp created_at "Added timestamp"
    }

    ORDER {
        uuid id PK
        varchar order_reference UK "Human readable reference (e.g. PC-202611-0042)"
        uuid customer_id FK "Customer profile"
        uuid store_pickup_location_id FK "Pickup branch if delivery_method is pickup"
        varchar order_status "Pending, Confirmed, Processing, Shipped, Delivered, Cancelled"
        varchar payment_status "Pending, Paid, Failed, Expired, Refunded, Cancelled"
        varchar payment_method "Mobile Banking, Cash on Delivery"
        varchar delivery_method "courier or pickup"
        decimal subtotal "Total gross item price (MMK)"
        decimal delivery_fee "Calculated delivery fee (MMK)"
        decimal discount_amount "Applied promotion discount (MMK)"
        decimal total_amount "Net payable amount (MMK)"
        varchar courier_name "Assigned courier company or rider"
        varchar tracking_number "Courier tracking or dispatch number"
        timestamp dispatched_at "Dispatch timestamp"
        varchar transaction_reference "Gateway transaction reference"
        text cancel_reason "Cancellation reason if cancelled"
        text customer_notes "Customer instructions"
        timestamp created_at "Order placement timestamp"
        timestamp updated_at "Last status modification"
    }

    ORDER_DELIVERY_ADDRESS {
        uuid id PK
        uuid order_id FK "Owning order"
        varchar recipient_name "Recipient full name"
        varchar phone "Recipient contact phone"
        text street_address "Street and home address"
        varchar township "Township name"
        varchar city "City name"
        varchar building "Building / Apartment / Room number"
        varchar nearby_landmark "Visual reference landmark for rider dispatch"
        decimal latitude "GPS Latitude (WGS 84)"
        decimal longitude "GPS Longitude (WGS 84)"
        text delivery_instructions "Rider instructions"
        timestamp created_at "Creation timestamp"
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK "Parent order"
        uuid product_id FK "Original product reference"
        uuid variant_id FK "Original variant reference"
        varchar product_name_snapshot "Frozen product name at checkout"
        varchar sku_snapshot "Frozen SKU at checkout"
        varchar variant_label_snapshot "Frozen variant description"
        varchar image_url_snapshot "Frozen primary image preview"
        int quantity "Purchased unit count"
        decimal unit_price_snapshot "Unit price paid (MMK)"
        decimal total_price "Total line amount (quantity * unit_price)"
        timestamp created_at "Created timestamp"
    }

    ORDER_TIMELINE {
        uuid id PK
        uuid order_id FK "Associated order"
        varchar status "Status transition target"
        text note "Operational note or system log"
        varchar actor "User, Staff name, or System / Gateway"
        timestamp created_at "Event timestamp"
    }

    ORDER_LOOKUP_TOKEN {
        uuid id PK
        uuid order_id FK "Target order"
        varchar token_hash UK "Secure hashed token for guest tracking"
        varchar phone_last_digits "Verification security check (e.g. last 4 digits)"
        int lookup_attempts "Rate-limiting counter"
        timestamp expires_at "Token expiry timestamp"
        timestamp created_at "Token issuance timestamp"
    }

    PAYMENT_TRANSACTION {
        uuid id PK
        uuid order_id FK "Target order"
        varchar gateway_provider "MyanMyanPay"
        varchar transaction_reference UK "Gateway generated reference"
        varchar merchant_order_id "Merchant order identification"
        decimal amount "Billed transaction amount (MMK)"
        varchar currency "MMK"
        varchar status "Pending, Paid, Failed, Expired, Cancelled, Refunded"
        text payment_url "Redirect payment URL"
        text qr_code_url "QR payload or image URL"
        jsonb request_payload "Payload sent to payment gateway"
        jsonb webhook_payload "Raw webhook payload received"
        timestamp expires_at "Transaction expiry timestamp"
        timestamp paid_at "Confirmation timestamp"
        timestamp created_at "Initiation timestamp"
    }

    REFUND_RECORD {
        uuid id PK
        uuid order_id FK "Target order"
        decimal amount "Refunded amount (MMK)"
        boolean is_full_refund "Full or partial refund flag"
        text reason "Refund rationale (Out of stock, customer return)"
        varchar transaction_reference "Bank or gateway refund slip reference"
        varchar processed_by "Admin staff identifier"
        text notes "Internal audit notes"
        timestamp refunded_at "Execution timestamp"
    }

    INVENTORY_ADJUSTMENT {
        uuid id PK
        uuid product_id FK "Target product"
        uuid variant_id FK "Target variant or null for parent"
        uuid order_id FK "Associated order if triggered by purchase/cancellation"
        varchar type "increase or decrease"
        int quantity "Quantity changed"
        int previous_stock "Stock before adjustment"
        int new_stock "Stock after adjustment"
        varchar reason "Reason description"
        varchar performed_by "Staff user or System Workflow"
        timestamp created_at "Adjustment timestamp"
    }

    PROMOTION {
        uuid id PK
        varchar title "Campaign promotion title"
        varchar subtitle "Campaign marketing subtitle"
        varchar code UK "Promo voucher code (e.g. GLOW15)"
        varchar banner_image_url "Promotional campaign visual artwork / banner URL"
        varchar banner_mobile_image_url "Mobile-optimized aspect banner URL"
        varchar banner_bg_color "Fallback brand background hex code"
        varchar discount_type "percentage or fixed_amount"
        decimal discount_value "Discount value (e.g. 15% or 5,000 MMK)"
        decimal minimum_order_amount "Minimum basket requirement (MMK)"
        timestamp start_date "Start date"
        timestamp end_date "Expiration date"
        boolean is_active "Active toggle"
        int usage_count "Redemption count"
        timestamp created_at "Created timestamp"
    }

    PROMOTION_PRODUCT {
        uuid id PK
        uuid promotion_id FK "Scoping promotion"
        uuid product_id FK "Eligible product"
    }

    BANNER {
        uuid id PK
        uuid promotion_id FK "Optional link to active promotion campaign"
        varchar title "Banner internal label"
        varchar image_url "High-resolution banner graphic"
        varchar link_url "Storefront destination link"
        int display_order "Display weight"
        boolean is_active "Active toggle"
        timestamp created_at "Created timestamp"
    }

    STATIC_PAGE {
        uuid id PK
        varchar slug UK "Page slug (e.g. about-us, return-policy, terms)"
        varchar title "Page headline"
        text content_html "Renderable markdown or HTML content"
        boolean is_published "Public visibility flag"
        timestamp updated_at "Last updated timestamp"
    }

    NOTIFICATION {
        uuid id PK
        varchar title "Notification title"
        text message "Notification body text"
        varchar type "order, stock, or system"
        boolean is_read "Read indicator"
        uuid order_id FK "Optional order relation"
        uuid product_id FK "Optional product relation"
        timestamp created_at "Created timestamp"
    }

    AUDIT_LOG {
        uuid id PK
        uuid admin_user_id FK "Admin actor"
        varchar action "CREATE, UPDATE, DELETE, CONFIG_CHANGE"
        varchar entity_type "PRODUCT, ORDER, SETTING, CATEGORY"
        varchar entity_id "Target entity ID"
        jsonb changes "Before and after diff"
        varchar ip_address "Origin client IP"
        timestamp created_at "Action timestamp"
    }

    STORE_SETTINGS {
        uuid id PK
        varchar store_name "Pretty Corner"
        varchar tagline "Beauty & Cosmetics Boutique"
        varchar contact_email "Support email address"
        varchar contact_phone "Customer service phone"
        varchar viber_phone "Viber business line"
        text store_address "Physical store / fulfillment address"
        varchar currency "MMK"
        timestamp updated_at "Last settings update"
    }
```

---

## 3. Data Dictionary: Detailed Specification of Normalized Entities

### 3.1 Product Multi-Image Asset Management (`PRODUCT_IMAGE`)
* `id` (`uuid`, PK): Image asset identifier.
* `product_id` (`uuid`, FK, NOT NULL): Associated parent product.
* `image_url` (`varchar(500)`, NOT NULL): CDN or storage path.
* `display_order` (`int`, DEFAULT `0`): Sequential display sort index.
* `is_primary` (`boolean`, DEFAULT `false`): Hero thumbnail flag for listings.

### 3.2 In-Store Pickup Location (`STORE_PICKUP_LOCATION`)
* `id` (`uuid`, PK): Store location ID.
* `store_name` (`varchar(120)`, NOT NULL): Store branch (e.g., "Pretty Corner Hledan Branch").
* `address`, `township`, `city` (`varchar`): Pickup premises address.
* `operating_hours` (`varchar(100)`): E.g. "Mon - Sun: 9:00 AM - 6:00 PM".
* `instructions` (`text`): Collection guidance (e.g. "Show Order Reference at counter").

### 3.3 Promotion Campaign Visual Assets & Scoped Product Association (`PROMOTION` & `PROMOTION_PRODUCT`)
* `PROMOTION.banner_image_url` (`varchar(500)`): High-resolution desktop/tablet promotional artwork (e.g. 1920x600px).
* `PROMOTION.banner_mobile_image_url` (`varchar(500)`): Mobile-optimized aspect ratio promotional graphic (e.g. 800x800px or 1080x1350px).
* `PROMOTION.banner_bg_color` (`varchar(30)`): Fallback color theme while image loads.
* `BANNER.promotion_id` (`uuid`, FK, NULLABLE): Direct link connecting homepage carousel banners to active promotional campaigns.
* `PROMOTION_PRODUCT.promotion_id` (`uuid`, FK, NOT NULL): Target campaign.
* `PROMOTION_PRODUCT.product_id` (`uuid`, FK, NOT NULL): Explicitly eligible product.
* Avoids unstructured arrays; enables indexed queries to answer *"Is this item eligible for discount?"*.

### 3.4 Immutable Order Address Snapshot (`ORDER_DELIVERY_ADDRESS`)
* One-to-one relationship with `ORDER`.
* Records recipient name, contact phone, street, township, building, landmark, and GPS coordinates frozen at checkout.
* Eliminates cascading mutations if a guest customer updates their saved addresses later.

### 3.5 Hierarchical Categories (`CATEGORY`)
* `parent_category_id` (`uuid`, FK, NULLABLE): Self-referencing link enabling subcategories (e.g. *Skincare* $\to$ *Sunscreen*).

### 3.6 Wishlist & Saved Items (`WISHLIST` & `WISHLIST_ITEM`)
* Manages guest and returning customer saved items (`PC-OS-011`) keyed by anonymous browser session token or authenticated customer ID.

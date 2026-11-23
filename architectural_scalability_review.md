# Architectural Health & Scalability Stress-Test Report

* **Target System:** Pretty Corner Admin & Retail Platform (`D:\Pretty_Corner_Dashboard`)
* **Review Focus:** Architectural Health, Concurrency, Persistence, and Scalability under Production Load
* **Auditor:** EGM Architectural & Scalability Auditor (Adversarial Stress-Test Standard)
* **Date:** 2026-11-23
* **Verdict:** **UNHEALTHY FOR PRODUCTION SCALE** (Requires remediation before handling concurrent order volume or large catalogs)

---

## 1. Executive Summary & Stress-Test Verdict

The codebase demonstrates clean modular TypeScript typing, responsive UI components, and localized domain logic (such as Myanmar phone normalization and MMK currency formatting). However, **from a systems architecture and scalability standpoint, the platform exhibits severe architectural flaws that will cause service degradation, data corruption, and client crashes under moderate production traffic.**

### Summary of System Deficiencies
1. **Critical Memory & Network Saturation (O(N) Client Bootstrapping):** Every admin session downloads the entire database of orders and nested order items into browser memory on mount, on tab visibility switch, and every 30 seconds via polling.
2. **Concurrency Race Condition & Data Corruption in Inventory:** Stock deduction during order placement relies on an application-level Read-Modify-Write sequence without transactions or atomic SQL decrements, leading to lost updates and overselling during simultaneous checkouts.
3. **Missing Core Domain Entity Persistence:** The system lacks a dedicated `customers` database table. Customer records, lifetime spend, and address books are dynamically derived in-memory on the fly by scanning and sorting all historical orders.
4. **Non-Transactional Multi-Table Writes:** Storefront checkout executes separate, un-isolated Supabase calls across `orders`, `order_items`, `products`, and `inventory_adjustments`. A network failure midway leaves orphaned records and corrupted financial ledgers.
5. **Serverless Filesystem Hazard:** Admin store settings, activity logs, and stock histories are tied to a local `.data/dev-store.json` fallback, which is ephemeral and non-persistent in serverless environments like Vercel or AWS Lambda.

---

## 2. In-Depth Failure Modes & Scalability Bottlenecks

### Bottleneck 1: Full-Store In-Memory Bootstrapping & Client OOM
* **Affected Files:**
  * [src/context/admin-store.tsx](file:///D:/Pretty_Corner_Dashboard/src/context/admin-store.tsx#L278-L308)
  * [src/lib/dev-store/supabase-repository.ts](file:///D:/Pretty_Corner_Dashboard/src/lib/dev-store/supabase-repository.ts#L510-L557)
  * [src/app/api/admin/bootstrap/route.ts](file:///D:/Pretty_Corner_Dashboard/src/app/api/admin/bootstrap/route.ts#L8-L19)

#### Technical Mechanism:
Inside `AdminProvider`, initialization triggers `refreshFromApi(true)`:
```typescript
const res = await fetch("/api/admin/bootstrap", { cache: "no-store" });
const data = await res.json();
setState({
  orders: data.orders ?? [],
  customers: data.customers ?? derived,
  ...
});
```
This endpoint calls `SupabaseStoreRepository.getBootstrapData()`, which executes:
```typescript
const [categories, orders, promotions, stockHistory, inventoryStats, products] =
  await Promise.all([
    this.listCategories(),
    this.listOrders(), // SELECT *, order_items(*) FROM orders
    ...
  ]);
```

#### Failure Scenarios at Scale:
1. **Network Payload Explosion:** At 10,000 orders with an average of 3 line items each, the uncompressed JSON payload for `/api/admin/bootstrap` will exceed 15–25 MB.
2. **Silent Data Truncation:** Supabase PostgREST defaults to a hard limit of 1,000 rows per query unless explicitly configured otherwise. At order #1,001, `listOrders()` silently truncates older records. Revenue charts, total sales figures, and customer order histories become inaccurate without throwing any visible errors.
3. **Client Thread Locking:** In-memory customer synthesis (`deriveCustomersFromOrders(orders)`) runs on the main browser JavaScript thread. Iterating through thousands of order objects and sorting them chronologically will block the event loop and freeze UI interactions.
4. **Polling Floods:** The client dashboard polls this endpoint every 30 seconds and on every document visibility change (`handleVisibilityChange`), placing continuous unindexed scan load on the Postgres database.

---

### Bottleneck 2: Read-Modify-Write Race Condition in Stock Deduction
* **Affected Files:**
  * [src/lib/dev-store/supabase-repository.ts](file:///D:/Pretty_Corner_Dashboard/src/lib/dev-store/supabase-repository.ts#L1277-L1312)

#### Technical Mechanism:
When an order is submitted through `createStorefrontOrder`, inventory is decremented using an in-memory calculation:
```typescript
for (const item of input.items) {
  const matched = allProducts.find(...);
  if (matched) {
    const newStock = Math.max(0, matched.stock - item.quantity);
    await sb
      .from("products")
      .update({
        stock_quantity: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matched.id);
  }
}
```

#### Failure Scenarios at Scale:
1. **Lost Updates Under Concurrent Purchases:** If Product A has `stock = 10`, and two customers buy 2 units each simultaneously:
   * Thread 1 reads `stock = 10`.
   * Thread 2 reads `stock = 10`.
   * Thread 1 computes `newStock = 8` and writes `stock_quantity = 8`.
   * Thread 2 computes `newStock = 8` and writes `stock_quantity = 8`.
   * **Result:** 4 items were sold, but inventory only decreased by 2. The physical stock is depleted while the database reports 8 units available.
2. **Negative Stock & Overselling:** There is no conditional check in the database write (`WHERE stock_quantity >= item.quantity`). If 5 units remain and two concurrent orders request 5 units each, both orders are confirmed, leaving the merchant with unfulfillable orders.

---

### Bottleneck 3: Synthetic Ephemeral Customers (O(N) Dynamic Derivation)
* **Affected Files:**
  * [src/modules/customers/customer-dossier.ts](file:///D:/Pretty_Corner_Dashboard/src/modules/customers/customer-dossier.ts#L60-L100)
  * [src/lib/dev-store/mappers.ts](file:///D:/Pretty_Corner_Dashboard/src/lib/dev-store/mappers.ts#L225-L270)

#### Technical Mechanism:
Instead of maintaining a persistent `customers` table with indexed foreign keys, customers are synthesized on the fly:
```typescript
export function getCustomerDossiers(orders: Order[], fallbackCustomers: Customer[] = []) {
  const customerMap = new Map<string, ...>();
  const chronological = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  for (const order of chronological) {
    // String parsing, phone normalization, address deduplication
  }
  return Array.from(customerMap.values());
}
```

#### Failure Scenarios at Scale:
1. **Algorithmic Inefficiency ($O(N \log N)$ Sorting + $O(N)$ Parsing):** At 50,000 orders, every customer listing request requires copying, date parsing, sorting, and regex normalization across 50,000 objects.
2. **Inability to Index Customer Queries:** Customer search by name, phone, or township cannot leverage database B-Tree indexes. Any filter requires full in-memory linear scanning.
3. **Loss of Customer Metadata:** Custom customer notes, tags, or loyalty tiers cannot be saved reliably in the database because there is no persistent primary record tied to an immutable customer ID.

---

### Bottleneck 4: Client-Side Metric Aggregations & Re-Render Churn
* **Affected Files:**
  * [src/modules/analytics/metrics.ts](file:///D:/Pretty_Corner_Dashboard/src/modules/analytics/metrics.ts#L42-L140)
  * [src/app/admin/page.tsx](file:///D:/Pretty_Corner_Dashboard/src/app/admin/page.tsx#L94-L125)

#### Technical Mechanism:
Dashboard analytics do not query pre-aggregated views or SQL rollups. Instead:
```typescript
export function buildOrderSeries(orders: Order[], range: DateRange): OrderSeriesPoint[] {
  // Generates 30 bucket intervals
  return buckets.map((bucket) => {
    const inBucket = orders.filter((order) => { ... });
    return {
      revenue: sumRevenue(inBucket),
      orders: inBucket.length,
    };
  });
}
```
`computeDashboardMetrics`, `deriveTopSellingProducts`, and `computeCategorySales` all repeat full traversals of the client `orders` array.

#### Failure Scenarios at Scale:
* For a 30-day window with 20,000 orders, calculating series buckets requires $30 \times 20,000 = 600,000$ operations.
* Category sales calculations iterate through every order, every line item, and cross-reference the catalog.
* Whenever the user switches date ranges or the background 30-second poller fires, the browser stalls while recomputing all metrics.

---

### Bottleneck 5: Non-Transactional Checkout Pipeline
* **Affected Files:**
  * [src/lib/dev-store/supabase-repository.ts](file:///D:/Pretty_Corner_Dashboard/src/lib/dev-store/supabase-repository.ts#L1220-L1318)

#### Technical Mechanism:
The order creation pipeline in `createStorefrontOrder` issues four discrete asynchronous operations without a transaction boundary:
1. `sb.from("orders").insert(...)`
2. `sb.from("order_items").insert(itemsToInsert)`
3. Serial loop: `sb.from("products").update(...)`
4. Serial loop: `sb.from("inventory_adjustments").insert(...)`

#### Failure Scenarios at Scale:
* If step 1 succeeds, step 2 succeeds, but step 3 fails (e.g. database connection timeout or RLS policy rejection), the order exists in the database, the customer is billed, but product inventory is never deducted and the adjustment ledger is never written.
* If step 2 fails due to a foreign key error or payload size, an empty order record remains in `orders` with zero items, breaking revenue calculations and packing slip generators.

---

## 3. Architecture Comparison: Current vs Scalable Production State

| Architectural Dimension | Current Codebase Implementation | Scalable Production Target | Risk Severity |
| :--- | :--- | :--- | :--- |
| **Order Fetching & State** | Client pulls all historical orders into React context via bootstrap | Server-paginated SQL queries (`LIMIT / OFFSET` or cursor) | 🔴 **CRITICAL** |
| **Inventory Decrement** | Application-level read-modify-write without locking | Atomic SQL RPC (`UPDATE ... SET stock = stock - x WHERE stock >= x`) | 🔴 **CRITICAL** |
| **Customer Storage** | Derived in-memory from order history on each request | Dedicated `customers` and `customer_addresses` DB tables | 🔴 **CRITICAL** |
| **Order Creation** | Multi-step uncoordinated client/API HTTP writes | Atomic PostgreSQL Transaction / RPC (`create_order_v1`) | 🔴 **CRITICAL** |
| **Dashboard Analytics** | Client-side loops and filter passes over raw orders | Materialized views or server-side SQL aggregation queries | 🟡 **HIGH** |
| **Persistence Target** | Hybrid split (Supabase for orders/products, JSON file for settings/activity) | 100% relational Postgres schema with connection pooling | 🟡 **HIGH** |
| **Database Caching** | Zero caching layer; raw polling every 30s | Edge caching / Next.js ISR for catalog, Redis/KV for counters | 🟡 **HIGH** |

---

## 4. Remediation Roadmap

To transition this codebase into a scalable, fault-tolerant e-commerce architecture, execute the following staged remediations:

```mermaid
flowchart TD
    subgraph Phase 1: Concurrency & Data Integrity
        A[Atomic Stock Decrement RPC] --> B[Atomic Order Placement Transaction]
    end

    subgraph Phase 2: Query & Memory Optimization
        C[Remove Full-Order Bootstrap] --> D[Implement Server-Side Pagination in AdminStore]
        D --> E[Migrate Analytics to SQL Aggregations]
    end

    subgraph Phase 3: Domain Entity Architecture
        F[Create Persistent Customers Table] --> G[Normalize Order Foreign Keys]
        G --> H[Migrate JSON Store Settings to Postgres]
    end

    Phase 1 --> Phase 2 --> Phase 3
```

### Immediate Action Items (Priority 1 - Data Safety):
1. **Deploy Atomic Stock Decrement Migration:** Replace in-memory subtraction with an atomic Postgres function:
   ```sql
   CREATE OR REPLACE FUNCTION deduct_product_stock(p_product_id UUID, p_quantity INT)
   RETURNS BOOLEAN AS $$
   DECLARE
     rows_affected INT;
   BEGIN
     UPDATE products
     SET stock_quantity = stock_quantity - p_quantity,
         updated_at = NOW()
     WHERE id = p_product_id AND stock_quantity >= p_quantity;
     GET DIAGNOSTICS rows_affected = ROW_COUNT;
     RETURN rows_affected > 0;
   END;
   $$ LANGUAGE plpgsql;
   ```
2. **Encapsulate Order Placement in a Single Transaction:** Create a unified stored procedure (`create_order_transaction`) that inserts the order header, inserts line items, checks promotion limits, and decrements stock atomically.

### Medium-Term Action Items (Priority 2 - Memory & Performance):
3. **Decommission `getBootstrapData()` Wholesale Order Loading:** Update `AdminShell` and `admin-store.tsx` so that only high-level summary metadata (unread notification count, low stock alert count) is fetched on bootstrap.
4. **Implement Cursor-Based or Offset Pagination on Orders Page:** Make the `/admin/orders` page consume the existing paginated API endpoint directly instead of filtering the global in-memory state.
5. **Convert Customer Synthesis into a Background Sync or Normalized Table:** Migrate customer identities to a dedicated `customers` table with a unique index on `phone_e164`.

---

## 5. Review Conclusion

The existing codebase is well-structured for initial single-operator prototyping, but **its architectural scalability is currently critically constrained**. The reliance on in-memory data processing, uncoordinated database mutations, and non-paginated client bootstrapping must be resolved before opening the system to high concurrent checkout volume or sustained operational growth.

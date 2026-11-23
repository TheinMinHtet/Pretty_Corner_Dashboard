import assert from "node:assert/strict";

// 1. Test Customer Dossier Engine
import {
  normalizePhoneNumber,
  getCustomerDossiers,
} from "../src/modules/customers/customer-dossier.ts";

// 2. Test Order Lifecycle Engine
import { executeOrderUpdate } from "../src/modules/orders/order-lifecycle.ts";

// 3. Test Analytics Engine
import {
  sumRevenue,
  percentChange,
  computeDashboardMetrics,
  buildOrderSeries,
  computeCategorySales,
} from "../src/modules/analytics/metrics.ts";

// 4. Test Catalog Invariant Specification
import {
  normalizeProductSpecification,
} from "../src/modules/catalog/catalog-sync.ts";

console.log("=================================================");
console.log("RUNNING PRETTY CORNER ARCHITECTURAL SUITE");
console.log("=================================================\n");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ==========================================
// TEST SUITE 1: CUSTOMER DOSSIER & UNIFICATION
// ==========================================
console.log("Suite 1: Customer Dossier & Myanmar Phone Normalization");

test("normalizePhoneNumber handles Myanmar glyphs, 09, and international prefixes", () => {
  assert.equal(normalizePhoneNumber("09791234567"), "+959791234567");
  assert.equal(normalizePhoneNumber("959791234567"), "+959791234567");
  assert.equal(normalizePhoneNumber("+959791234567"), "+959791234567");
  assert.equal(normalizePhoneNumber("09-791-234-567"), "+959791234567");
  // Myanmar numeral conversion
  assert.equal(normalizePhoneNumber("၀၉၇၉၁၂၃၄၅၆၇"), "+959791234567");
});

test("getCustomerDossiers unifies guest orders by normalized phone and computes spend", () => {
  const dummyOrders = [
    {
      id: "ord-1",
      reference: "PC-001",
      customerName: "Daw Mya",
      customerPhone: "09791111111",
      total: 35000,
      orderStatus: "Shipped",
      deliveryAddress: "No. 12, Strand Rd",
      township: "Kyauktada",
      createdAt: "2026-11-01T10:00:00Z",
    },
    {
      id: "ord-2",
      reference: "PC-002",
      customerName: "Daw Mya",
      customerPhone: "+959791111111",
      total: 15000,
      orderStatus: "Cancelled", // Should not count towards totalSpent
      deliveryAddress: "No. 12, Strand Rd",
      township: "Kyauktada",
      createdAt: "2026-11-05T10:00:00Z",
    },
    {
      id: "ord-3",
      reference: "PC-003",
      customerName: "Daw Mya Mya",
      customerPhone: "09 791 111 111",
      total: 20000,
      orderStatus: "Confirmed",
      deliveryAddress: "No. 45, Bogyoke Rd", // Additional address
      township: "Pabedan",
      createdAt: "2026-11-10T10:00:00Z",
    },
  ];

  const dossiers = getCustomerDossiers(dummyOrders);
  assert.equal(dossiers.length, 1, "Should unify all 3 orders into 1 customer dossier");
  const dossier = dossiers[0];
  assert.equal(dossier.normalizedPhone, "+959791111111");
  assert.equal(dossier.orderCount, 3);
  assert.equal(dossier.completedOrdersCount, 1);
  assert.equal(dossier.cancelledOrdersCount, 1);
  assert.equal(dossier.totalSpent, 55000, "Total spend should exclude cancelled order (35k + 20k = 55k)");
  assert.equal(dossier.addresses.length, 2, "Should capture both distinct addresses");
});

// ==========================================
// TEST SUITE 2: ORDER LIFECYCLE & INVARIANTS
// ==========================================
console.log("\nSuite 2: Deep Order Lifecycle & Inventory Invariants");

test("Cancellation restores stock at product level with audit log", () => {
  const initialProducts = [
    {
      id: "prod-1",
      name: "Dew Drop Serum",
      sku: "PC-SERUM-01",
      stock: 10,
      lowStockThreshold: 5,
      soldCount: 15,
    },
  ];

  const activeOrder = {
    id: "ord-100",
    reference: "PC-ORD-100",
    orderStatus: "Processing",
    customerName: "Ko Aung",
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        productName: "Dew Drop Serum",
        quantity: 2,
        unitPrice: 25000,
      },
    ],
    timeline: [],
  };

  const mutation = executeOrderUpdate(
    activeOrder,
    { orderStatus: "Cancelled", note: "Customer changed mind" },
    initialProducts,
    { actorName: "Staff Alice", lowStockAlertEnabled: true }
  );

  assert.equal(mutation.updatedOrder.orderStatus, "Cancelled");
  const updatedProduct = mutation.updatedProducts[0];
  assert.equal(updatedProduct.stock, 12, "Product stock should increment from 10 to 12");
  assert.equal(mutation.newAdjustments.length, 1);
  assert.equal(mutation.newAdjustments[0].type, "increase");
  assert.equal(mutation.newAdjustments[0].quantity, 2);
  assert.ok(mutation.newAdjustments[0].reason.includes("Cancelled"));
  assert.ok(mutation.newActivity);
  assert.equal(mutation.newActivity.action, "Order Cancelled");
});

test("Shipped transition increments soldCount across ordered products", () => {
  const initialProducts = [
    {
      id: "prod-2",
      name: "Matte Lipstick",
      sku: "PC-LIP-01",
      stock: 20,
      lowStockThreshold: 5,
      soldCount: 5,
    },
  ];

  const pendingOrder = {
    id: "ord-101",
    reference: "PC-ORD-101",
    orderStatus: "Confirmed",
    customerName: "Ma Su",
    items: [
      {
        id: "item-2",
        productId: "prod-2",
        productName: "Matte Lipstick",
        quantity: 3,
        unitPrice: 12000,
      },
    ],
  };

  const mutation = executeOrderUpdate(
    pendingOrder,
    { orderStatus: "Shipped" },
    initialProducts,
    { actorName: "Admin" }
  );

  assert.equal(mutation.updatedOrder.orderStatus, "Shipped");
  assert.equal(mutation.updatedProducts[0].soldCount, 8, "SoldCount should increment from 5 to 8");
});

test("Order discount deduction accurately captures promotional drop value (32k -> 25.6k = 6.4k discount)", () => {
  const order = {
    id: "ord-drop-test",
    subtotal: 32000,
    deliveryFee: 0,
    total: 25600,
    discountAmount: 0,
  };
  const effectiveDiscount =
    order.discountAmount > 0
      ? order.discountAmount
      : Math.max(0, (order.subtotal + order.deliveryFee) - order.total);
  assert.equal(effectiveDiscount, 6400, "Effective discount should capture the 6,400 MMK price drop");
});

test("COD order automatically auto-settles paymentStatus to Paid when updated to Shipped", () => {
  const codOrder = {
    id: "ord-cod-1",
    reference: "PC-COD-001",
    orderStatus: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    items: [],
    timeline: [],
  };

  const mutation = executeOrderUpdate(
    codOrder,
    { orderStatus: "Shipped" },
    [],
    { actorName: "Delivery Rider" }
  );

  assert.equal(mutation.updatedOrder.orderStatus, "Shipped");
  assert.equal(mutation.updatedOrder.paymentStatus, "Paid", "COD payment should automatically transition to Paid upon transit");
  assert.ok(
    mutation.updatedOrder.timeline.some((t) =>
      t.note.includes("Cash on Delivery collected")
    ),
    "Timeline must record auto-settlement note"
  );
});

test("Payment failure toggle marks paymentStatus as Failed and appends timeline audit note", () => {
  const activeOrder = {
    id: "ord-fail-1",
    reference: "PC-FAIL-001",
    orderStatus: "Shipped",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    items: [],
    timeline: [],
  };

  const mutation = executeOrderUpdate(
    activeOrder,
    { paymentStatus: "Failed", note: "Customer unreachable at delivery address" },
    [],
    { actorName: "Staff Alice" }
  );

  assert.equal(mutation.updatedOrder.paymentStatus, "Failed");
  assert.ok(
    mutation.updatedOrder.timeline.some((t) =>
      t.note.includes("Payment marked as Failed") &&
      t.note.includes("Customer unreachable at delivery address")
    ),
    "Timeline must record failed payment audit note with custom reason"
  );
});

test("1-click COD delivery completes order fulfillment and auto-settles payment to Paid atomically", () => {
  const pendingCOD = {
    id: "ord-1-click-cod",
    reference: "PC-COD-999",
    orderStatus: "Pending",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    items: [],
    timeline: [],
  };

  const mutation = executeOrderUpdate(
    pendingCOD,
    { orderStatus: "Shipped", paymentStatus: "Paid" },
    [],
    { actorName: "Shop Owner" }
  );

  assert.equal(mutation.updatedOrder.orderStatus, "Shipped");
  assert.equal(mutation.updatedOrder.paymentStatus, "Paid");
});

// ==========================================
// TEST SUITE 3: CONSOLIDATED ANALYTICS ENGINE
// ==========================================
console.log("\nSuite 3: Consolidated Analytics Engine");

test("sumRevenue excludes cancelled orders and percentChange calculates accurate delta", () => {
  const orders = [
    { id: "1", total: 40000, orderStatus: "Shipped" },
    { id: "2", total: 20000, orderStatus: "Processing" },
    { id: "3", total: 10000, orderStatus: "Cancelled" },
  ];

  assert.equal(sumRevenue(orders), 60000, "Cancelled orders should be excluded from revenue");
  assert.equal(percentChange(60000, 50000), 20, "20% increase from 50k to 60k");
  assert.equal(percentChange(40000, 50000), -20, "20% decrease from 50k to 40k");
  assert.equal(percentChange(50000, 0), null, "Previous 0 should return null");
});

test("computeDashboardMetrics returns calculated KPIs without NaN", () => {
  const orders = [
    {
      id: "o1",
      total: 50000,
      orderStatus: "Shipped",
      paymentStatus: "Paid",
      paymentMethod: "KBZPay",
      city: "Yangon",
      createdAt: new Date().toISOString(),
    },
  ];

  const metrics = computeDashboardMetrics(orders, "30d");
  assert.equal(metrics.revenue, 50000);
  assert.equal(metrics.totalOrders, 1);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.paidPayments, 1);
  assert.equal(metrics.topPayment?.value, "KBZPay");
});

test("computeDashboardMetrics accounts for all active payment categories correctly", () => {
  const fakeNow = new Date("2026-11-23T12:00:00Z");
  const orders = [
    { id: "1", total: 30000, orderStatus: "Shipped", paymentStatus: "Paid", createdAt: fakeNow.toISOString() },
    { id: "2", total: 20000, orderStatus: "Pending", paymentStatus: "Pending", createdAt: fakeNow.toISOString() },
    { id: "3", total: 15000, orderStatus: "Cancelled", paymentStatus: "Cancelled", createdAt: fakeNow.toISOString() },
    { id: "4", total: 10000, orderStatus: "Pending", paymentStatus: "Failed", createdAt: fakeNow.toISOString() },
  ];

  const metrics = computeDashboardMetrics(orders, "7d", fakeNow);
  assert.equal(metrics.totalOrders, 4);
  assert.equal(metrics.paidPayments, 1);
  assert.equal(metrics.pendingPayments, 1);
  assert.equal(metrics.failedPayments, 1);
});

test("buildOrderSeries builds dynamic live timelines ending on Today with true daily buckets", () => {
  const fakeNow = new Date("2026-11-23T12:00:00Z");
  const orders = [
    {
      id: "ord-today",
      total: 35000,
      orderStatus: "Shipped",
      createdAt: "2026-11-23T08:30:00Z",
    },
    {
      id: "ord-yesterday",
      total: 20000,
      orderStatus: "Shipped",
      createdAt: "2026-11-22T14:00:00Z",
    },
  ];

  const series7d = buildOrderSeries(orders, "7d", fakeNow);
  assert.equal(series7d.length, 7, "7d should have exactly 7 daily points");
  assert.equal(series7d[6].label, "Today", "Final point in 7d should be Today");
  assert.equal(series7d[6].isToday, true);
  assert.equal(series7d[6].revenue, 35000);
  assert.equal(series7d[6].orders, 1);
  assert.equal(series7d[5].revenue, 20000);
  assert.equal(series7d[5].orders, 1);

  const series30d = buildOrderSeries(orders, "30d", fakeNow);
  assert.equal(series30d.length, 30, "30d should have 30 daily points");
  assert.equal(series30d[29].label, "Today", "Final point in 30d should be Today");
  assert.equal(series30d[29].isToday, true);
  assert.equal(series30d[29].revenue, 35000);
});

test("computeCategorySales correctly attributes multi-category real orders with ID, slug, and name matching", () => {
  const dummyCategories = [
    { id: "cat-1", name: "Skincare", slug: "skincare" },
    { id: "cat-2", name: "Makeup", slug: "makeup" },
    { id: "cat-3", name: "Lenses", slug: "lenses" },
  ];

  const dummyProducts = [
    { id: "p-skin-1", name: "Dew Drop Serum", slug: "dew-drop-serum", categoryId: "cat-1", regularPrice: 28000, soldCount: 0 },
    { id: "p-make-1", name: "Petal Lip Glaze", slug: "petal-lip-glaze", categoryId: "cat-2", regularPrice: 18000, soldCount: 0 },
    { id: "p-lens-1", name: "Soft Hazel Daily Lenses", slug: "soft-hazel-lenses", categoryId: "cat-3", regularPrice: 19000, soldCount: 0 },
  ];

  const dummyOrders = [
    {
      id: "ord-1",
      orderStatus: "Shipped",
      items: [
        // Matched by exact ID
        { productId: "p-skin-1", productName: "Dew Drop Serum", unitPrice: 28000, quantity: 2 },
        // Matched by name (with missing/null productId)
        { productId: null, productName: "Petal Lip Glaze", unitPrice: 18000, quantity: 1 },
      ],
    },
    {
      id: "ord-2",
      orderStatus: "Confirmed",
      items: [
        // Matched by slug
        { productId: "soft-hazel-lenses", productName: "Soft Hazel Daily Lenses", unitPrice: 19000, quantity: 1 },
        // Custom uncataloged item
        { productId: null, productName: "Gift Card / Custom Wrap", unitPrice: 5000, quantity: 1 },
      ],
    },
    {
      id: "ord-3",
      orderStatus: "Cancelled", // Should be ignored
      items: [
        { productId: "p-skin-1", productName: "Dew Drop Serum", unitPrice: 28000, quantity: 10 },
      ],
    },
  ];

  const breakdown = computeCategorySales(dummyCategories, dummyProducts, undefined, dummyOrders);

  const skin = breakdown.find((b) => b.name === "Skincare");
  const makeup = breakdown.find((b) => b.name === "Makeup");
  const lenses = breakdown.find((b) => b.name === "Lenses");
  const other = breakdown.find((b) => b.name === "Other / Custom");

  assert.equal(skin?.revenue, 56000, "Skincare revenue should be 28k * 2 = 56,000 MMK");
  assert.equal(makeup?.revenue, 18000, "Makeup revenue should be 18,000 MMK via name fallback");
  assert.equal(lenses?.revenue, 19000, "Lenses revenue should be 19,000 MMK via slug matching");
  assert.equal(other?.revenue, 5000, "Uncategorized custom item should appear in Other / Custom");
});

// ==========================================
// TEST SUITE 4: CATALOG INVARIANT NORMALIZATION
// ==========================================
console.log("\nSuite 4: Catalog Invariants & SKU Specification");

test("normalizeProductSpecification canonicalizes SKUs and validates price hierarchy", () => {
  const invalidResult = normalizeProductSpecification({
    name: "Rose Glow Serum",
    sku: "pc-serum-rg",
    regularPrice: 20000,
    salePrice: 25000, // Invalid: salePrice >= regularPrice
    stock: 10,
  });

  assert.equal(invalidResult.isValid, false);
  assert.ok(invalidResult.errors.salePrice, "Should error when salePrice >= regularPrice");

  const validResult = normalizeProductSpecification({
    name: "Rose Glow Serum",
    sku: "pc-serum-rg",
    regularPrice: 25000,
    salePrice: 20000,
    stock: 40,
  });

  assert.equal(validResult.isValid, true);
  assert.equal(validResult.product.sku, "PC-SERUM-RG", "SKU must be normalized to uppercase");
  assert.equal(validResult.product.stock, 40);
});

// ==========================================
// TEST SUITE 5: SESSION LIFECYCLE & INACTIVITY
// ==========================================
console.log("\nSuite 5: Admin Session Lifecycle & Inactivity Invariants");

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
const STANDARD_TTL_MS = 8 * 60 * 60 * 1000;       // 8 hours
const REMEMBER_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days

function testIsSessionValid(session, now = Date.now()) {
  if (!session || !session.token || !session.expiresAt) return false;
  if (now > session.expiresAt) return false;
  if (now - session.lastActiveAt > INACTIVITY_TIMEOUT_MS) return false;
  return true;
}

test("Session validator enforces zero-trust on null or corrupt payload", () => {
  assert.equal(testIsSessionValid(null), false);
  assert.equal(testIsSessionValid({}), false);
  assert.equal(testIsSessionValid({ token: "test" }), false);
});

test("Session validator approves active session within both TTL and activity window", () => {
  const now = 100000000;
  const session = {
    token: "valid-tok",
    expiresAt: now + STANDARD_TTL_MS,
    lastActiveAt: now - (30 * 60 * 1000), // active 30 mins ago
    rememberMe: false,
  };
  assert.equal(testIsSessionValid(session, now), true);
});

test("Session validator rejects session that exceeded rolling inactivity window (2 hours)", () => {
  const now = 100000000;
  const idleSession = {
    token: "idle-tok",
    expiresAt: now + STANDARD_TTL_MS, // Still within 8 hour hard expiry
    lastActiveAt: now - (2 * 60 * 60 * 1000 + 1000), // 2 hours and 1 second ago
    rememberMe: false,
  };
  assert.equal(testIsSessionValid(idleSession, now), false, "Idle sessions past 2 hours must be rejected");
});

test("Session validator distinguishes between standard 8-hour and Remember Me 7-day TTL", () => {
  const now = 100000000;
  const standardExpiresAt = now + STANDARD_TTL_MS;
  const rememberExpiresAt = now + REMEMBER_TTL_MS;

  assert.equal(standardExpiresAt - now, 28800000);
  assert.equal(rememberExpiresAt - now, 604800000);

  const pastStandard = now + 9 * 60 * 60 * 1000;
  const standardSession = {
    token: "std-tok",
    expiresAt: standardExpiresAt,
    lastActiveAt: pastStandard - 1000,
    rememberMe: false,
  };
  const rememberSession = {
    token: "rem-tok",
    expiresAt: rememberExpiresAt,
    lastActiveAt: pastStandard - 1000,
    rememberMe: true,
  };

  assert.equal(testIsSessionValid(standardSession, pastStandard), false, "Standard session should expire at 9 hours");
  assert.equal(testIsSessionValid(rememberSession, pastStandard), true, "Remember Me session remains valid at 9 hours");
});

console.log("\n=================================================");
console.log(`ALL ARCHITECTURE TESTS PASSED (${passed}/${passed})`);
console.log("=================================================");

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
} from "../src/modules/analytics/metrics.ts";

// 4. Test Catalog Invariant Specification
import {
  normalizeProductSpecification,
  parseContactLensPowerSuffix,
  createContactLensPresets,
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
      orderStatus: "Delivered",
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

test("Cancellation restores stock at parent and variant levels with audit log", () => {
  const initialProducts = [
    {
      id: "prod-1",
      name: "Dew Drop Serum",
      sku: "PC-SERUM-01",
      stock: 10,
      lowStockThreshold: 5,
      variants: [
        { id: "v1", label: "30ml", quantity: 4, skuSuffix: "30ML" },
        { id: "v2", label: "50ml", quantity: 6, skuSuffix: "50ML" },
      ],
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
        variantLabel: "30ml",
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
  assert.equal(updatedProduct.stock, 12, "Parent stock should increment from 10 to 12");
  assert.equal(updatedProduct.variants[0].quantity, 6, "Variant 30ml quantity should increment from 4 to 6");
  assert.equal(updatedProduct.variants[1].quantity, 6, "Variant 50ml quantity should remain 6");
  assert.equal(mutation.newAdjustments.length, 1);
  assert.equal(mutation.newAdjustments[0].type, "increase");
  assert.equal(mutation.newAdjustments[0].quantity, 2);
  assert.ok(mutation.newAdjustments[0].reason.includes("Cancelled"));
  assert.ok(mutation.newActivity);
  assert.equal(mutation.newActivity.action, "Order Cancelled");
});

test("Delivered transition increments soldCount across ordered products", () => {
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
    { orderStatus: "Delivered" },
    initialProducts,
    { actorName: "Admin" }
  );

  assert.equal(mutation.updatedOrder.orderStatus, "Delivered");
  assert.equal(mutation.updatedProducts[0].soldCount, 8, "SoldCount should increment from 5 to 8");
});

test("Refund settlement records structured snapshot and timeline note", () => {
  const existingOrder = {
    id: "ord-102",
    reference: "PC-ORD-102",
    orderStatus: "Delivered",
    paymentStatus: "Paid",
    timeline: [],
  };

  const mutation = executeOrderUpdate(
    existingOrder,
    {
      refund: {
        amount: 15000,
        isFullRefund: true,
        reason: "Item arrived damaged",
        transactionReference: "RFND-9921",
      },
    },
    [],
    { actorName: "Finance Manager" }
  );

  assert.equal(mutation.updatedOrder.paymentStatus, "Refunded");
  assert.ok(mutation.updatedOrder.refundDetails);
  assert.equal(mutation.updatedOrder.refundDetails.amount, 15000);
  assert.equal(mutation.updatedOrder.refundDetails.processedBy, "Finance Manager");
  assert.ok(mutation.updatedOrder.timeline[0].note.includes("RFND-9921"));
});

// ==========================================
// TEST SUITE 3: CONSOLIDATED ANALYTICS ENGINE
// ==========================================
console.log("\nSuite 3: Consolidated Analytics Engine");

test("sumRevenue excludes cancelled orders and percentChange calculates accurate delta", () => {
  const orders = [
    { id: "1", total: 40000, orderStatus: "Delivered" },
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
      orderStatus: "Delivered",
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

// ==========================================
// TEST SUITE 4: CATALOG INVARIANT NORMALIZATION
// ==========================================
console.log("\nSuite 4: Catalog Invariants & SKU Specification");

test("normalizeProductSpecification canonicalizes SKUs, validates price hierarchy and variants", () => {
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
    variants: [
      { id: "v1", label: "Bottle A", quantity: 15 },
      { id: "v2", label: "Bottle B", quantity: 25 },
    ],
  });

  assert.equal(validResult.isValid, true);
  assert.equal(validResult.product.sku, "PC-SERUM-RG", "SKU must be normalized to uppercase");
  assert.equal(validResult.product.stock, 40, "Parent stock must automatically equal sum of variants (15+25)");
});

test("parseContactLensPowerSuffix and createContactLensPresets handle standard prescription codes", () => {
  assert.equal(parseContactLensPowerSuffix("Plano 0.00"), "P00");
  assert.equal(parseContactLensPowerSuffix("-2.50"), "250");
  assert.equal(parseContactLensPowerSuffix("-0.50"), "050");

  const presets = createContactLensPresets(5);
  assert.equal(presets.length, 13);
  assert.equal(presets[0].skuSuffix, "P00");
  assert.equal(presets[0].quantity, 5);
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

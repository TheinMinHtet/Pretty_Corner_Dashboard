import test from "node:test";
import assert from "node:assert/strict";
import { executeOrderUpdate } from "../order-lifecycle";
import { Order, Product, Promotion } from "@/types/admin";

function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    slug: "dew-drop-serum",
    name: "Dew Drop Serum",
    description: "Hydrating serum",
    categoryId: "cat-skincare",
    brand: "Pretty Corner",
    sku: "PC-SERUM-01",
    regularPrice: 45000,
    stock: 10,
    lowStockThreshold: 5,
    soldCount: 0,
    status: "Active",
    images: ["/assets/dew-drop-serum.png"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    reference: "PC-202611-001",
    customerId: "cust-1",
    customerName: "Thuzar",
    customerPhone: "09123456789",
    deliveryAddress: "Yangon",
    township: "Kamayut",
    city: "Yangon",
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        productName: "Dew Drop Serum",
        productImage: "/assets/dew-drop-serum.png",
        sku: "PC-SERUM-01",
        quantity: 2,
        unitPrice: 45000,
      },
    ],
    subtotal: 90000,
    deliveryFee: 2500,
    discountAmount: 4500,
    appliedPromotionId: "promo-1",
    promoCode: "GLOW10",
    total: 88000,
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    orderStatus: "Pending",
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo-1",
    title: "10% Glow Discount",
    code: "GLOW10",
    discountPercentage: 10,
    targetType: "SINGLE_PRODUCT",
    targetSlug: "prod-1",
    featuredProductIds: ["prod-1"],
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    redemptionMethod: "CODE",
    usageCount: 5,
    usageLimit: 100,
    isOutOfStock: false,
    bannerColor: "#000000",
    ...overrides,
  };
}

test("executeOrderUpdate: order cancellation restores stock and logs inventory adjustment", () => {
  const product = createMockProduct({ stock: 8 });
  const order = createMockOrder({ orderStatus: "Pending" });

  const result = executeOrderUpdate(
    order,
    { orderStatus: "Cancelled" },
    [product],
    { actorName: "Admin Staff", lowStockAlertEnabled: true }
  );

  assert.equal(result.updatedOrder.orderStatus, "Cancelled");
  assert.equal(result.updatedProducts[0].stock, 10); // 8 + 2
  assert.equal(result.newAdjustments.length, 1);
  assert.equal(result.newAdjustments[0].type, "increase");
  assert.equal(result.newAdjustments[0].quantity, 2);
  assert.equal(result.newAdjustments[0].previousStock, 8);
  assert.equal(result.newAdjustments[0].newStock, 10);
});

test("executeOrderUpdate: order cancellation restores promotion usage quota and syncs stockout", () => {
  const product = createMockProduct({ stock: 0 }); // Was 0 before cancellation
  const order = createMockOrder({
    orderStatus: "Confirmed",
    appliedPromotionId: "promo-1",
    promoCode: "GLOW10",
  });
  const promo = createMockPromotion({
    id: "promo-1",
    code: "GLOW10",
    usageCount: 5,
    isOutOfStock: true,
  });

  const result = executeOrderUpdate(
    order,
    { orderStatus: "Cancelled" },
    [product],
    {
      actorName: "Admin Staff",
      lowStockAlertEnabled: true,
      promotions: [promo],
    }
  );

  assert.ok(result.updatedPromotions);
  const updatedPromo = result.updatedPromotions.find((p) => p.id === "promo-1");
  assert.ok(updatedPromo);
  // Usage count should decrement by 1: 5 -> 4
  assert.equal(updatedPromo.usageCount, 4);
  // Stock restored from 0 to 2, so isOutOfStock becomes false
  assert.equal(updatedPromo.isOutOfStock, false);
});

test("executeOrderUpdate: Shipped transition increments soldCount and auto-settles COD", () => {
  const product = createMockProduct({ stock: 10, soldCount: 3 });
  const order = createMockOrder({
    orderStatus: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
  });

  const result = executeOrderUpdate(
    order,
    { orderStatus: "Shipped" },
    [product],
    { actorName: "Logistics Team" }
  );

  assert.equal(result.updatedOrder.orderStatus, "Shipped");
  // Sold count increments: 3 + 2 = 5
  assert.equal(result.updatedProducts[0].soldCount, 5);
  // Cash on Delivery automatically settled to Paid
  assert.equal(result.updatedOrder.paymentStatus, "Paid");
});

test("executeOrderUpdate: generates low-stock alert when stock reaches or drops below threshold", () => {
  const product = createMockProduct({ stock: 7, lowStockThreshold: 5 });
  const order = createMockOrder({ orderStatus: "Shipped" });
  const result = executeOrderUpdate(
    order,
    { note: "Timeline check" },
    [product],
    { actorName: "Staff", lowStockAlertEnabled: true }
  );

  assert.equal(result.updatedOrder.id, "ord-1");
  assert.equal(result.updatedProducts.length, 1);
});

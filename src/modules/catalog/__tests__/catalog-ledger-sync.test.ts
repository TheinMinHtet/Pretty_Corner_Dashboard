import test from "node:test";
import assert from "node:assert/strict";
import {
  executeStockAdjustment,
  evaluatePromotionStockout,
} from "../catalog-sync";
import { Product, Promotion } from "@/types/admin";

function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-skincare-1",
    slug: "gentle-cleanser",
    name: "Gentle Cleanser",
    description: "Cleanser for sensitive skin",
    categoryId: "cat-skincare",
    brand: "Pretty Corner",
    sku: "PC-CLN-01",
    regularPrice: 28000,
    stock: 5,
    lowStockThreshold: 3,
    soldCount: 12,
    status: "Active",
    images: ["/assets/dew-drop-serum.png"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo-special",
    title: "Cleanser Special",
    code: "CLEAN20",
    discountPercentage: 20,
    targetType: "SINGLE_PRODUCT",
    targetSlug: "prod-skincare-1",
    featuredProductIds: ["prod-skincare-1"],
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    redemptionMethod: "CODE",
    usageCount: 1,
    isOutOfStock: false,
    bannerColor: "#000000",
    ...overrides,
  };
}

test("executeStockAdjustment: clamps stock to non-negative and creates immutable adjustment ledger", () => {
  const product = createMockProduct({ stock: 4 });

  // Attempt to decrease more than current stock (4 - 10)
  const result = executeStockAdjustment(product, "decrease", 10, {
    actorName: "Inventory Manager",
    reason: "Damaged during shipment",
  });

  assert.equal(result.updatedProduct.stock, 0); // Non-negative clamp
  assert.equal(result.adjustment.type, "decrease");
  assert.equal(result.adjustment.quantity, 10);
  assert.equal(result.adjustment.previousStock, 4);
  assert.equal(result.adjustment.newStock, 0);
  assert.equal(result.adjustment.performedBy, "Inventory Manager");
  assert.equal(result.adjustment.reason, "Damaged during shipment");
});

test("executeStockAdjustment: automatically flags promotion as out-of-stock when product hits 0", () => {
  const product = createMockProduct({ stock: 2 });
  const promo = createMockPromotion({ isOutOfStock: false });

  const result = executeStockAdjustment(product, "decrease", 2, {
    actorName: "Admin",
    promotions: [promo],
  });

  assert.equal(result.updatedProduct.stock, 0);
  assert.ok(result.updatedPromotions);
  const updatedPromo = result.updatedPromotions.find((p) => p.id === promo.id);
  assert.ok(updatedPromo);
  assert.equal(updatedPromo.isOutOfStock, true);
});

test("executeStockAdjustment: restores promotion stockout flag when restocking product", () => {
  const product = createMockProduct({ stock: 0 });
  const promo = createMockPromotion({ isOutOfStock: true });

  const result = executeStockAdjustment(product, "increase", 15, {
    actorName: "Admin",
    promotions: [promo],
  });

  assert.equal(result.updatedProduct.stock, 15);
  assert.ok(result.updatedPromotions);
  const updatedPromo = result.updatedPromotions.find((p) => p.id === promo.id);
  assert.ok(updatedPromo);
  assert.equal(updatedPromo.isOutOfStock, false);
});

test("evaluatePromotionStockout: CATEGORY promotion only flags when 100% of category items are 0", () => {
  const promo: Promotion = {
    id: "promo-cat",
    title: "Skincare Sale",
    code: "SKINCARE",
    discountPercentage: 15,
    targetType: "CATEGORY",
    targetSlug: "cat-skincare",
    featuredProductIds: [],
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    redemptionMethod: "CODE",
    usageCount: 0,
    isOutOfStock: false,
    bannerColor: "#000000",
  };

  const prodA = createMockProduct({ id: "prod-a", categoryId: "cat-skincare", stock: 0 });
  const prodB = createMockProduct({ id: "prod-b", categoryId: "cat-skincare", stock: 3 });

  // prodA is 0, but prodB has 3 -> NOT out of stock
  assert.equal(evaluatePromotionStockout(promo, [prodA, prodB]), false);

  // Both prodA and prodB are 0 -> IS out of stock
  const prodBDepleted = createMockProduct({ id: "prod-b", categoryId: "cat-skincare", stock: 0 });
  assert.equal(evaluatePromotionStockout(promo, [prodA, prodBDepleted]), true);
});

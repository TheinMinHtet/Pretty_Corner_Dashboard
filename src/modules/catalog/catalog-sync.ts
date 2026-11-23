import { NotificationItem, Product, StockAdjustment, Promotion } from "@/types/admin";
import { generateId } from "@/lib/utils";

export interface NormalizedProductDraft {
  product: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount">;
  errors: Record<string, string>;
  isValid: boolean;
}

/**
 * Deep Domain Invariant Validator and Normalizer:
 * Validates product payloads, enforces canonical SKU formats,
 * and ensures sale price is strictly less than regular price.
 */
export function normalizeProductSpecification(
  raw: Omit<
    Partial<Product>,
    "regularPrice" | "salePrice" | "stock" | "lowStockThreshold"
  > & {
    name?: string;
    sku?: string;
    regularPrice?: number | string;
    salePrice?: number | string;
    stock?: number | string;
    lowStockThreshold?: number | string;
  }
): NormalizedProductDraft {
  const errors: Record<string, string> = {};

  const name = (raw.name || "").trim();
  if (!name) {
    errors.name = "Product name is required";
  }

  const rawSku = (raw.sku || "").trim().toUpperCase();
  if (!rawSku) {
    errors.sku = "SKU is required";
  }

  const reg = Number(raw.regularPrice);
  if (!raw.regularPrice || Number.isNaN(reg) || reg <= 0) {
    errors.regularPrice = "Enter a valid price (> 0)";
  }

  let salePrice: number | undefined;
  if (
    raw.salePrice !== undefined &&
    raw.salePrice !== null &&
    String(raw.salePrice).trim() !== ""
  ) {
    const sale = Number(raw.salePrice);
    if (Number.isNaN(sale) || sale <= 0) {
      errors.salePrice = "Sale price must be greater than 0";
    } else if (reg > 0 && sale >= reg) {
      errors.salePrice = "Sale price must be less than regular price";
    } else {
      salePrice = sale;
    }
  }

  const rawStock = Number(raw.stock);
  if (raw.stock !== undefined && (Number.isNaN(rawStock) || rawStock < 0)) {
    errors.stock = "Stock cannot be negative";
  }

  const calculatedStock = Math.max(0, Number(raw.stock) || 0);

  const productDraft: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount"> = {
    name,
    description: (raw.description || "").trim(),
    categoryId: raw.categoryId || "",
    subcategory: raw.subcategory?.trim() || undefined,
    brand: (raw.brand || "").trim() || "Pretty Corner",
    sku: rawSku,
    regularPrice: reg || 0,
    salePrice,
    images: Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images
      : ["/assets/dew-drop-serum.png"],
    stock: calculatedStock,
    lowStockThreshold: Math.max(0, Number(raw.lowStockThreshold) || 10),
    status: raw.status || "Active",
    benefits: Array.isArray(raw.benefits) ? raw.benefits : undefined,
    usage: raw.usage?.trim() || undefined,
    ingredients: raw.ingredients?.trim() || undefined,
    specs: raw.specs?.trim() || undefined,
    badge: raw.badge?.trim() || undefined,
    tagline: raw.tagline?.trim() || undefined,
    subtitle: raw.subtitle?.trim() || undefined,
  };

  return {
    product: productDraft,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export interface StockAdjustmentResult {
  updatedProduct: Product;
  adjustment: StockAdjustment;
}

/**
 * Applies a stock adjustment directly to a product.
 * Invariants:
 * - Stock values never drop below zero.
 * - Produces an immutable StockAdjustment log item.
 */
export function applyStockAdjustment(
  product: Product,
  type: "increase" | "decrease",
  quantity: number,
  actorName: string,
  reason?: string
): StockAdjustmentResult {
  const now = new Date().toISOString();
  const previousProductStock = product.stock;

  const newProductStock =
    type === "increase"
      ? previousProductStock + quantity
      : Math.max(0, previousProductStock - quantity);

  const defaultReason = reason || `Stock ${type === "increase" ? "restock" : "deduction"}`;

  const adjustment: StockAdjustment = {
    id: generateId("stk"),
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    type,
    quantity,
    previousStock: previousProductStock,
    newStock: newProductStock,
    reason: defaultReason,
    performedBy: actorName,
    createdAt: now,
  };

  const updatedProduct: Product = {
    ...product,
    stock: newProductStock,
    updatedAt: now,
  };

  return { updatedProduct, adjustment };
}

/**
 * Evaluates whether a promotion should be flagged as out-of-stock based on current catalog products stock.
 */
export function evaluatePromotionStockout(promo: Promotion, products: Product[]): boolean {
  if (promo.targetType === "SINGLE_PRODUCT") {
    const target = promo.targetSlug || promo.featuredProductIds?.[0];
    if (!target) return false;
    const matched = products.find((p) => p.id === target || p.slug === target);
    if (!matched) return false;
    return (matched.stock || 0) <= 0;
  }

  if (promo.targetType === "CATEGORY") {
    const catTarget = promo.targetSlug;
    if (!catTarget) return false;
    const linked = products.filter((p) => p.categoryId === catTarget);
    if (linked.length === 0) return false;
    return linked.every((p) => (p.stock || 0) <= 0);
  }

  if (promo.featuredProductIds && promo.featuredProductIds.length > 0) {
    const targets = promo.featuredProductIds;
    const linked = products.filter((p) => targets.includes(p.id) || (p.slug && targets.includes(p.slug)));
    if (linked.length === 0) return false;
    return linked.every((p) => (p.stock || 0) <= 0);
  }

  return false;
}

export interface DeepStockAdjustmentResult {
  updatedProduct: Product;
  adjustment: StockAdjustment;
  updatedPromotions?: Promotion[];
  newNotification?: NotificationItem;
}

/**
 * Deep Inventory Ledger Orchestrator:
 * 1. Clamps product stock to non-negative invariants.
 * 2. Emits an immutable StockAdjustment ledger record.
 * 3. Evaluates & updates affected promotion is_out_of_stock flags.
 * 4. Dispatches low stock and out-of-stock notification triggers when enabled.
 */
export function executeStockAdjustment(
  product: Product,
  type: "increase" | "decrease",
  quantity: number,
  options: {
    actorName: string;
    reason?: string;
    promotions?: Promotion[];
    lowStockAlertEnabled?: boolean;
  }
): DeepStockAdjustmentResult {
  const { updatedProduct, adjustment } = applyStockAdjustment(
    product,
    type,
    quantity,
    options.actorName,
    options.reason
  );

  const now = new Date().toISOString();
  let updatedPromotions: Promotion[] | undefined;
  if (options.promotions && options.promotions.length > 0) {
    updatedPromotions = options.promotions.map((promo) => {
      const isOut = evaluatePromotionStockout(promo, [updatedProduct]);
      if (promo.isOutOfStock !== isOut) {
        return {
          ...promo,
          isOutOfStock: isOut,
          updatedAt: now,
        };
      }
      return promo;
    });
  }

  let newNotification: NotificationItem | undefined;
  if (options.lowStockAlertEnabled) {
    if (updatedProduct.stock === 0 && product.stock > 0) {
      newNotification = {
        id: generateId("notif"),
        type: "stock",
        title: `Out of stock — ${updatedProduct.name}`,
        message: `${updatedProduct.name} (${updatedProduct.sku}) is out of stock.`,
        href: "/admin/inventory",
        read: false,
        createdAt: now,
      };
    } else if (
      updatedProduct.stock > 0 &&
      updatedProduct.stock <= updatedProduct.lowStockThreshold &&
      product.stock > updatedProduct.lowStockThreshold
    ) {
      newNotification = {
        id: generateId("notif"),
        type: "stock",
        title: `Low stock — ${updatedProduct.name}`,
        message: `${updatedProduct.name} has only ${updatedProduct.stock} units remaining (threshold ${updatedProduct.lowStockThreshold}).`,
        href: "/admin/inventory",
        read: false,
        createdAt: now,
      };
    }
  }

  return {
    updatedProduct,
    adjustment,
    updatedPromotions,
    newNotification,
  };
}

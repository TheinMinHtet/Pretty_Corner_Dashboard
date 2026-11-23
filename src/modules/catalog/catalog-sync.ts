import { Product, StockAdjustment, Promotion } from "@/types/admin";
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

  return false;
}

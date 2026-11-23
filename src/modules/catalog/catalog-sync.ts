import { Product, ProductVariant, StockAdjustment, Promotion } from "@/types/admin";
import { generateId } from "@/lib/utils";

export const COMMON_LENS_POWERS = [
  "Plano 0.00",
  "-0.50",
  "-1.00",
  "-1.50",
  "-2.00",
  "-2.50",
  "-3.00",
  "-3.50",
  "-4.00",
  "-4.50",
  "-5.00",
  "-5.50",
  "-6.00",
] as const;

/**
 * Derives a standardized, canonical SKU suffix for a contact lens power.
 */
export function parseContactLensPowerSuffix(power: string): string {
  if (power === "Plano 0.00" || power.toLowerCase() === "plano") {
    return "P00";
  }
  return power.replace(/[-.]/g, "").toUpperCase();
}

/**
 * Generates ready-to-use variant items for standard contact lens prescription powers.
 */
export function createContactLensPresets(initialQuantity: number = 10): ProductVariant[] {
  return COMMON_LENS_POWERS.map((power) => ({
    id: generateId("var"),
    label: power,
    lensPower: power,
    quantity: initialQuantity,
    skuSuffix: parseContactLensPowerSuffix(power),
  }));
}

/**
 * Derives a standardized, canonical SKU suffix for a product variant.
 */
export function deriveVariantSku(parentSku: string, variant: ProductVariant): string {
  if (variant.skuSuffix && variant.skuSuffix.trim()) {
    return `${parentSku}-${variant.skuSuffix.trim().toUpperCase()}`;
  }
  return `${parentSku}-${variant.id.toUpperCase()}`;
}

/**
 * Reconciles parent product stock to be the exact sum of variant quantities
 * when variants are configured.
 */
export function reconcileProductStock(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  }
  return product.stock || 0;
}

export interface NormalizedProductDraft {
  product: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount">;
  errors: Record<string, string>;
  isValid: boolean;
}

/**
 * Deep Domain Invariant Validator and Normalizer:
 * Validates product payloads, enforces canonical SKU formats, computes variant totals,
 * ensures sale price is strictly less than regular price, and reconciles stock.
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
    errors.regularPrice = "Enter a valid regular price (> 0)";
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

  const variants: ProductVariant[] = (raw.variants || []).map((v, idx) => {
    const label = (v.label || "").trim();
    let skuSuffix = v.skuSuffix?.trim().toUpperCase();
    if (!skuSuffix && v.lensPower) {
      skuSuffix = parseContactLensPowerSuffix(v.lensPower);
    }
    return {
      id: v.id || `var-${idx + 1}`,
      label: label || `Variant ${idx + 1}`,
      color: v.color?.trim() || undefined,
      lensPower: v.lensPower?.trim() || undefined,
      quantity: Math.max(0, Number(v.quantity) || 0),
      priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
      skuSuffix,
    };
  });

  if (variants.length === 0 && raw.stock !== undefined) {
    const rawStock = Number(raw.stock);
    if (Number.isNaN(rawStock) || rawStock < 0) {
      errors.stock = "Stock cannot be negative";
    }
  }

  const calculatedStock =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
      : Math.max(0, Number(raw.stock) || 0);

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
    isContactLens: Boolean(raw.isContactLens),
    variants,
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
 * Applies a stock adjustment to a product or a specific variant.
 * Invariants:
 * - If variant is targeted, variant quantity is updated and parent stock adjusts by the exact delta.
 * - Stock values never drop below zero.
 * - Produces an immutable StockAdjustment log item.
 */
export function applyStockAdjustment(
  product: Product,
  variantId: string | undefined,
  type: "increase" | "decrease",
  quantity: number,
  actorName: string,
  reason?: string
): StockAdjustmentResult {
  const now = new Date().toISOString();
  const previousProductStock = product.stock;

  let newProductStock = previousProductStock;
  let updatedVariants = product.variants ? [...product.variants] : [];
  let variantLabel: string | undefined;
  let adjustmentSku = product.sku;

  if (variantId && variantId !== "parent" && updatedVariants.length > 0) {
    const targetVariant = updatedVariants.find((v) => v.id === variantId);
    if (targetVariant) {
      variantLabel = targetVariant.label;
      adjustmentSku = deriveVariantSku(product.sku, targetVariant);
      const prevQty = targetVariant.quantity;
      const newQty =
        type === "increase"
          ? prevQty + quantity
          : Math.max(0, prevQty - quantity);
      const delta = newQty - prevQty;
      newProductStock = Math.max(0, previousProductStock + delta);

      updatedVariants = updatedVariants.map((v) =>
        v.id === variantId ? { ...v, quantity: newQty } : v
      );
    }
  } else {
    newProductStock =
      type === "increase"
        ? previousProductStock + quantity
        : Math.max(0, previousProductStock - quantity);
  }

  const defaultReason = reason || `Stock ${type === "increase" ? "restock" : "deduction"}${
    variantLabel ? ` (${variantLabel})` : ""
  }`;

  const adjustment: StockAdjustment = {
    id: generateId("stk"),
    productId: product.id,
    productName: product.name,
    sku: adjustmentSku,
    variantId: variantId !== "parent" ? variantId : undefined,
    variantLabel,
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
    variants: updatedVariants,
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

import { Product, ProductVariant, StockAdjustment } from "@/types/admin";
import { generateId } from "@/lib/utils";

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

import {
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  RefundDetails,
  StockAdjustment,
  OrderTimelineEvent,
} from "@/types/admin";
import { generateId } from "@/lib/utils";

export interface OrderTransitionResult {
  updatedOrder: Order;
  updatedProducts: Product[];
  newAdjustments: StockAdjustment[];
  timelineNote: string;
}

/**
 * Transitions an order to a new status.
 * Enforces domain invariants:
 * - Cancelling an order automatically restores inventory for parent and variant quantities.
 * - Stock restoration generates immutable StockAdjustment audit entries.
 * - Appends a structured OrderTimelineEvent.
 */
export function transitionOrderStatus(
  order: Order,
  targetStatus: OrderStatus,
  currentProducts: Product[],
  actorName: string,
  note?: string
): OrderTransitionResult {
  const now = new Date().toISOString();
  if (order.orderStatus === targetStatus) {
    return {
      updatedOrder: order,
      updatedProducts: currentProducts,
      newAdjustments: [],
      timelineNote: note || `Order remains ${targetStatus}`,
    };
  }

  const prevStatus = order.orderStatus;
  let updatedProducts = [...currentProducts];
  const newAdjustments: StockAdjustment[] = [];

  // Invariant: If transitioning to Cancelled from non-cancelled, restore stock
  if (targetStatus === "Cancelled" && prevStatus !== "Cancelled") {
    updatedProducts = updatedProducts.map((p) => {
      const itemsForProduct = order.items.filter((item) => item.productId === p.id);
      if (itemsForProduct.length === 0) return p;

      let stockIncrement = 0;
      let updatedVariants = p.variants ? [...p.variants] : [];

      for (const item of itemsForProduct) {
        stockIncrement += item.quantity;

        if (item.variantLabel && updatedVariants.length > 0) {
          updatedVariants = updatedVariants.map((v) => {
            if (v.label === item.variantLabel) {
              return { ...v, quantity: v.quantity + item.quantity };
            }
            return v;
          });
        }

        newAdjustments.push({
          id: generateId("stk"),
          productId: p.id,
          productName: p.name,
          sku: item.sku || p.sku,
          variantLabel: item.variantLabel,
          type: "increase",
          quantity: item.quantity,
          previousStock: p.stock,
          newStock: p.stock + item.quantity,
          reason: `Order ${order.reference} Cancelled - Stock Restored`,
          performedBy: actorName,
          createdAt: now,
        });
      }

      return {
        ...p,
        stock: p.stock + stockIncrement,
        variants: updatedVariants,
        updatedAt: now,
      };
    });
  }

  const defaultNote =
    targetStatus === "Cancelled"
      ? `Order cancelled. Stock restored to inventory.`
      : `Status updated to ${targetStatus}`;

  const eventNote = note?.trim() || defaultNote;

  const timelineEvent: OrderTimelineEvent = {
    status: targetStatus,
    timestamp: now,
    note: eventNote,
    actor: actorName,
  };

  const updatedOrder: Order = {
    ...order,
    orderStatus: targetStatus,
    timeline: [timelineEvent, ...(order.timeline || [])],
    updatedAt: now,
  };

  return {
    updatedOrder,
    updatedProducts,
    newAdjustments,
    timelineNote: eventNote,
  };
}

export interface PaymentSettlementInput {
  status?: PaymentStatus;
  reference?: string;
  refund?: Omit<RefundDetails, "refundedAt" | "processedBy">;
}

/**
 * Settles payment updates, gateway transaction references, and refunds.
 * Enforces domain invariants:
 * - Refunds create a structured RefundDetails snapshot and an audit timeline event.
 * - Payment reference updates are tracked without mutating unrelated order fields.
 */
export function settleOrderPayment(
  order: Order,
  settlement: PaymentSettlementInput,
  actorName: string
): Order {
  const now = new Date().toISOString();
  let updatedOrder: Order = {
    ...order,
    updatedAt: now,
  };

  if (settlement.status) {
    updatedOrder.paymentStatus = settlement.status;
  }

  if (settlement.reference !== undefined) {
    updatedOrder.transactionReference = settlement.reference.trim() || undefined;
  }

  if (settlement.refund) {
    const fullRefundDetails: RefundDetails = {
      ...settlement.refund,
      refundedAt: now,
      processedBy: actorName,
    };

    const refundTimelineNote = `Processed ${
      settlement.refund.isFullRefund ? "Full Refund" : "Partial Refund"
    } of ${settlement.refund.amount.toLocaleString()} MMK (Voucher: ${
      settlement.refund.transactionReference
    }). Reason: ${settlement.refund.reason}`;

    updatedOrder.paymentStatus = "Refunded";
    updatedOrder.refundDetails = fullRefundDetails;
    updatedOrder.timeline = [
      {
        status: order.orderStatus,
        timestamp: now,
        note: refundTimelineNote,
        actor: actorName,
      },
      ...(order.timeline || []),
    ];
  }

  return updatedOrder;
}

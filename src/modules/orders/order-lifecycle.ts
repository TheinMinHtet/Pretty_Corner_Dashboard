import {
  ActivityLogItem,
  NotificationItem,
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

export interface OrderMutationResult {
  updatedOrder: Order;
  updatedProducts: Product[];
  newAdjustments: StockAdjustment[];
  newNotifications: NotificationItem[];
  newActivity?: ActivityLogItem;
  timelineNote: string;
}

export interface PaymentSettlementInput {
  status?: PaymentStatus;
  reference?: string;
  refund?: Omit<RefundDetails, "refundedAt" | "processedBy">;
}

export interface OrderUpdateExecutionInput {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  transactionReference?: string;
  note?: string;
  refund?: Omit<RefundDetails, "refundedAt" | "processedBy">;
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

/**
 * Settles payment updates, gateway transaction references, and refunds.
 */
export function settleOrderPayment(
  order: Order,
  settlement: PaymentSettlementInput,
  actorName: string
): Order {
  const now = new Date().toISOString();
  const updatedOrder: Order = {
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

    updatedOrder.paymentStatus = settlement.refund.isFullRefund
      ? "Refunded"
      : updatedOrder.paymentStatus;
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

/**
 * Deep Domain Orchestrator:
 * Executes order updates with complete invariant enforcement:
 * 1. Status transitions with automatic stock restoration (parent & variant levels).
 * 2. Sold-count adjustment for delivered orders.
 * 3. Low stock and out-of-stock notification triggers.
 * 4. Audit activity logging and timeline event logging.
 * 5. Payment and refund settlement.
 */
export function executeOrderUpdate(
  order: Order,
  input: OrderUpdateExecutionInput,
  currentProducts: Product[],
  options: {
    actorName: string;
    lowStockAlertEnabled?: boolean;
  }
): OrderMutationResult {
  const now = new Date().toISOString();
  let workingOrder: Order = { ...order };
  let workingProducts: Product[] = [...currentProducts];
  const newAdjustments: StockAdjustment[] = [];
  const newNotifications: NotificationItem[] = [];
  let newActivity: ActivityLogItem | undefined;
  let timelineNote = "";

  const actor = options.actorName || "Admin Staff";

  // 1. Order Status Transition
  if (input.orderStatus && input.orderStatus !== workingOrder.orderStatus) {
    const prevStatus = workingOrder.orderStatus;
    const transition = transitionOrderStatus(
      workingOrder,
      input.orderStatus,
      workingProducts,
      actor,
      input.note
    );

    workingOrder = transition.updatedOrder;
    workingProducts = transition.updatedProducts;
    newAdjustments.push(...transition.newAdjustments);
    timelineNote = transition.timelineNote;

    // Invariant: Transitioning to or from Delivered updates soldCount
    if ((prevStatus === "Delivered") !== (input.orderStatus === "Delivered")) {
      const delta = input.orderStatus === "Delivered" ? 1 : -1;
      workingProducts = workingProducts.map((p) => {
        const qty = workingOrder.items
          .filter((i) => i.productId === p.id)
          .reduce((sum, i) => sum + i.quantity, 0);
        if (qty === 0) return p;
        return {
          ...p,
          soldCount: Math.max(0, p.soldCount + delta * qty),
          updatedAt: now,
        };
      });
    }

    // Low stock / Out of stock notification evaluation
    if (options.lowStockAlertEnabled) {
      for (const updatedProduct of workingProducts) {
        const previousProduct = currentProducts.find((p) => p.id === updatedProduct.id);
        if (!previousProduct) continue;

        if (updatedProduct.stock === 0 && previousProduct.stock > 0) {
          newNotifications.push({
            id: generateId("notif"),
            type: "stock",
            title: `Out of stock — ${updatedProduct.name}`,
            message: `${updatedProduct.name} (${updatedProduct.sku}) is out of stock.`,
            href: "/admin/inventory",
            read: false,
            createdAt: now,
          });
        } else if (
          updatedProduct.stock > 0 &&
          updatedProduct.stock <= updatedProduct.lowStockThreshold &&
          previousProduct.stock > updatedProduct.lowStockThreshold
        ) {
          newNotifications.push({
            id: generateId("notif"),
            type: "stock",
            title: `Low stock — ${updatedProduct.name}`,
            message: `${updatedProduct.name} has only ${updatedProduct.stock} units remaining (threshold ${updatedProduct.lowStockThreshold}).`,
            href: "/admin/inventory",
            read: false,
            createdAt: now,
          });
        }
      }
    }

    // Order status notification
    newNotifications.push({
      id: generateId("notif"),
      type: "order",
      title: `Order ${workingOrder.reference} ${input.orderStatus}`,
      message:
        transition.timelineNote ||
        `${workingOrder.customerName}'s order is now ${input.orderStatus}${
          input.orderStatus === "Cancelled" ? " and stock has been restored" : ""
        }.`,
      href: `/admin/orders/${workingOrder.id}`,
      read: false,
      createdAt: now,
    });

    // Activity log entry
    newActivity = {
      id: generateId("act"),
      action: `Order ${input.orderStatus}`,
      detail: `${workingOrder.reference} updated to ${input.orderStatus}`,
      category: "order",
      actor,
      timestamp: now,
    };
  }

  // 2. Payment Status Settlement
  if (input.paymentStatus && input.paymentStatus !== workingOrder.paymentStatus) {
    workingOrder = settleOrderPayment(
      workingOrder,
      { status: input.paymentStatus },
      actor
    );

    newActivity = {
      id: generateId("act"),
      action: "Payment Status Updated",
      detail: `${workingOrder.reference} payment marked as ${input.paymentStatus}`,
      category: "order",
      actor,
      timestamp: now,
    };
  }

  // 3. Payment Reference Update
  if (input.transactionReference !== undefined) {
    workingOrder = settleOrderPayment(
      workingOrder,
      { reference: input.transactionReference },
      actor
    );
  }

  // 4. Refund Processing
  if (input.refund) {
    workingOrder = settleOrderPayment(
      workingOrder,
      { refund: input.refund },
      actor
    );

    newActivity = {
      id: generateId("act"),
      action: "Order Refunded",
      detail: `Refunded ${input.refund.amount.toLocaleString()} MMK for ${workingOrder.reference}`,
      category: "order",
      actor,
      timestamp: now,
    };
  }

  return {
    updatedOrder: workingOrder,
    updatedProducts: workingProducts,
    newAdjustments,
    newNotifications,
    newActivity,
    timelineNote,
  };
}

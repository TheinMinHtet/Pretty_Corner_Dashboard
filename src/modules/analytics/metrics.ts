import {
  Category,
  Customer,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
} from "@/types/admin";
import {
  DATE_RANGES,
  DATE_RANGE_LABELS,
  DateRange,
  filterOrdersByRange,
  buildOrderSeries,
  revenueOrders,
  sumRevenue,
  percentChange,
  rangeStart,
  topShare,
} from "@/lib/analytics";

export {
  DATE_RANGES,
  DATE_RANGE_LABELS,
  filterOrdersByRange,
  buildOrderSeries,
  revenueOrders,
  sumRevenue,
  percentChange,
  rangeStart,
  topShare,
};
export type { DateRange };

export interface DashboardMetricsResult {
  revenue: number;
  previousRevenue: number;
  revenueChange: number | null;
  totalOrders: number;
  ordersChange: number | null;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  pendingShare: number;
  processingShare: number;
  completedShare: number;
  cancelledShare: number;
  avgOrderValue: number;
  paidPayments: number;
  pendingPayments: number;
  failedPayments: number;
  topPayment: { value: string; share: number } | null;
  topCity: { value: string; share: number } | null;
}

export function computeDashboardMetrics(
  orders: Order[],
  range: DateRange,
  now: Date = new Date()
): DashboardMetricsResult {
  const start = rangeStart(range, now);
  const span = Math.max(now.getTime() - start, 1);

  const current = filterOrdersByRange(orders, range, now);
  const previous = orders.filter((order) => {
    const created = new Date(order.createdAt).getTime();
    return created >= start - span && created < start;
  });

  const revenue = sumRevenue(current);
  const previousRevenue = sumRevenue(previous);
  const billable = current.filter((o) => o.orderStatus !== "Cancelled");

  const countBy = (status: OrderStatus) =>
    current.filter((o) => o.orderStatus === status).length;

  const totalOrders = current.length;
  const share = (count: number) =>
    totalOrders === 0 ? 0 : Math.round((count / totalOrders) * 100);

  const pending = countBy("Pending");
  const processing = countBy("Processing");
  const completed = countBy("Delivered");
  const cancelled = countBy("Cancelled");

  return {
    revenue,
    previousRevenue,
    revenueChange: percentChange(revenue, previousRevenue),
    totalOrders,
    ordersChange: percentChange(totalOrders, previous.length),
    pending,
    processing,
    completed,
    cancelled,
    pendingShare: share(pending),
    processingShare: share(processing),
    completedShare: share(completed),
    cancelledShare: share(cancelled),
    avgOrderValue: billable.length > 0 ? revenue / billable.length : 0,
    paidPayments: current.filter((o) => o.paymentStatus === "Paid").length,
    pendingPayments: current.filter((o) => o.paymentStatus === "Pending").length,
    failedPayments: current.filter(
      (o) => o.paymentStatus === "Failed" || o.paymentStatus === "Expired"
    ).length,
    topPayment: topShare(current.map((o) => o.paymentMethod)),
    topCity: topShare(current.map((o) => o.city)),
  };
}

export interface PaymentStatItem {
  name: string;
  count: number;
  revenue: number;
  color: string;
}

export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  KBZPay: "#38BDF8",
  WavePay: "#F59E0B",
  "CB Pay": "#EC4899",
  "AYA Pay": "#EF4444",
  "Cash on Delivery": "#10B981",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  Paid: "#10B981",
  Pending: "#F59E0B",
  Failed: "#EF4444",
  Expired: "#64748B",
  Refunded: "#8B5CF6",
  Cancelled: "#F43F5E",
};

export function computePaymentMethodStats(orders: Order[]): PaymentStatItem[] {
  const methods = [
    "KBZPay",
    "WavePay",
    "CB Pay",
    "AYA Pay",
    "Cash on Delivery",
  ] as const;

  return methods.map((m) => {
    const matched = orders.filter((o) => o.paymentMethod === m);
    const revenue = matched.reduce(
      (sum, o) => sum + (o.orderStatus !== "Cancelled" ? o.total : 0),
      0
    );
    return {
      name: m,
      count: matched.length,
      revenue,
      color: PAYMENT_METHOD_COLORS[m] || "#D96B91",
    };
  });
}

export function computePaymentStatusStats(orders: Order[]): PaymentStatItem[] {
  const statuses: PaymentStatus[] = ["Paid", "Pending", "Failed", "Expired", "Refunded"];

  return statuses.map((s) => {
    const matched = orders.filter((o) => o.paymentStatus === s);
    const revenue = matched.reduce(
      (sum, o) => sum + (o.orderStatus !== "Cancelled" ? o.total : 0),
      0
    );
    return {
      name: s,
      count: matched.length,
      revenue,
      color: PAYMENT_STATUS_COLORS[s] || "#94A3B8",
    };
  });
}

export interface CategoryRevenueItem {
  name: string;
  revenue: number;
  color: string;
}

export function computeCategorySales(
  categories: Category[],
  products: Product[],
  palette: string[] = ["#D96B91", "#E99AB5", "#F2B6CA", "#F8DDE5", "#806B73"]
): CategoryRevenueItem[] {
  return categories.map((cat, idx) => {
    const catProducts = products.filter((p) => p.categoryId === cat.id);
    const revenue = catProducts.reduce(
      (sum, p) => sum + p.soldCount * (p.salePrice ?? p.regularPrice),
      0
    );
    return {
      name: cat.name,
      revenue,
      color: palette[idx % palette.length],
    };
  });
}

export interface CustomerRetentionResult {
  repeatCustomers: number;
  newCustomers: number;
  repeatRatio: number;
  totalCustomers: number;
}

export function computeCustomerRetention(
  orders: Order[],
  customers: Customer[]
): CustomerRetentionResult {
  const orderCountByCustomer = new Map<string, number>();
  for (const o of orders) {
    orderCountByCustomer.set(
      o.customerId,
      (orderCountByCustomer.get(o.customerId) ?? 0) + 1
    );
  }

  let repeatCount = 0;
  let newCount = 0;
  for (const c of customers) {
    const ordersPlaced = orderCountByCustomer.get(c.id) ?? 0;
    if (ordersPlaced > 1) {
      repeatCount++;
    } else {
      newCount++;
    }
  }

  const total = customers.length;
  const repeatRatio = total > 0 ? Math.round((repeatCount / total) * 100) : 0;

  return {
    repeatCustomers: repeatCount,
    newCustomers: newCount,
    repeatRatio,
    totalCustomers: total,
  };
}

export interface InventoryStatsResult {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export function computeInventoryStats(products: Product[]): InventoryStatsResult {
  const total = products.length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
  ).length;
  const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;

  return { total, inStock, lowStock, outOfStock };
}

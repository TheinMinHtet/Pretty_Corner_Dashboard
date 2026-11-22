import {
  Category,
  Customer,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
} from "@/types/admin";

export type DateRange = "7d" | "30d" | "6m";

export const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "6m": "last 6 months",
};

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Inclusive start timestamp for a dashboard range. */
export function rangeStart(range: DateRange, now: Date = new Date()): number {
  if (range === "7d") return startOfDay(now).getTime() - 6 * DAY_MS;
  if (range === "30d") return startOfDay(now).getTime() - 29 * DAY_MS;
  return new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime();
}

/** Filters orders to those placed inside the selected range. */
export function filterOrdersByRange(
  orders: Order[],
  range: DateRange,
  now: Date = new Date()
): Order[] {
  const start = rangeStart(range, now);
  return orders.filter((order) => {
    const created = new Date(order.createdAt).getTime();
    return !Number.isNaN(created) && created >= start;
  });
}

export interface OrderSeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

/**
 * Builds revenue/order buckets straight from real orders:
 * daily for 7d, six-day blocks for 30d, calendar months for 6m.
 */
export function buildOrderSeries(
  orders: Order[],
  range: DateRange,
  now: Date = new Date()
): OrderSeriesPoint[] {
  const buckets: { label: string; from: number; to: number }[] = [];

  if (range === "6m") {
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        label: start.toLocaleDateString("en-US", { month: "short" }),
        from: start.getTime(),
        to: end.getTime(),
      });
    }
  } else {
    const today = startOfDay(now).getTime();
    const bucketCount = range === "7d" ? 7 : 5;
    const bucketDays = range === "7d" ? 1 : 6;

    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const endOffset = i * bucketDays;
      const startOffset = endOffset + bucketDays - 1;
      const start = today - startOffset * DAY_MS;
      buckets.push({
        label:
          range === "7d"
            ? new Date(start).toLocaleDateString("en-US", { weekday: "short" })
            : new Date(start).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
        from: start,
        to: today - endOffset * DAY_MS + DAY_MS,
      });
    }
  }

  return buckets.map((bucket) => {
    const inBucket = orders.filter((order) => {
      const created = new Date(order.createdAt).getTime();
      return created >= bucket.from && created < bucket.to;
    });
    const revenue = inBucket
      .filter((order) => order.orderStatus !== "Cancelled")
      .reduce((sum, order) => sum + order.total, 0);

    return { label: bucket.label, revenue, orders: inBucket.length };
  });
}

/** Orders that count toward sales totals (cancellations excluded). */
export function revenueOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.orderStatus !== "Cancelled");
}

export function sumRevenue(orders: Order[]): number {
  return revenueOrders(orders).reduce((sum, order) => sum + (order.total || 0), 0);
}

/** Percentage change between the current and previous period, or null. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Most frequent value of a field, with its share of the sample. */
export function topShare<T extends string>(
  values: T[]
): { value: T; share: number } | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let winner: T | null = null;
  let winnerCount = 0;
  counts.forEach((count, value) => {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  });
  if (winner === null) return null;
  return { value: winner, share: Math.round((winnerCount / values.length) * 100) };
}

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
      color: PAYMENT_METHOD_COLORS[m] || "#B73D67",
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
      color: PAYMENT_STATUS_COLORS[s] || "#7A6870",
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

export function deriveTopSellingProducts(
  orders: Order[],
  products: Product[],
  limit: number = 6
): Product[] {
  const productMetrics = new Map<string, { unitsSold: number; revenue: number }>();

  const validOrders = orders.filter(
    (o) => o.paymentStatus === "Paid" || o.orderStatus !== "Cancelled"
  );

  for (const order of validOrders) {
    for (const item of order.items || []) {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const revenue = quantity * unitPrice;

      const matchedProduct = products.find((p) => {
        if (item.productId && p.id === item.productId) {
          return true;
        }
        if (
          item.productName &&
          p.name &&
          p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      });

      if (matchedProduct) {
        const existing = productMetrics.get(matchedProduct.id) || {
          unitsSold: 0,
          revenue: 0,
        };
        existing.unitsSold += quantity;
        existing.revenue += revenue;
        productMetrics.set(matchedProduct.id, existing);
      }
    }
  }

  const augmentedProducts = products.map((p) => {
    const metrics = productMetrics.get(p.id);
    const unitsSoldFromOrders = metrics ? metrics.unitsSold : 0;
    const soldCount = Math.max(p.soldCount ?? 0, unitsSoldFromOrders);
    if (unitsSoldFromOrders > 0) {
      p.soldCount = soldCount;
    }
    const totalRevenue =
      metrics && metrics.revenue > 0
        ? metrics.revenue
        : soldCount * (p.salePrice ?? p.regularPrice);

    return {
      product: {
        ...p,
        soldCount,
      },
      unitsSold: soldCount,
      totalRevenue,
    };
  });

  augmentedProducts.sort((a, b) => {
    if (b.unitsSold !== a.unitsSold) {
      return b.unitsSold - a.unitsSold;
    }
    return b.totalRevenue - a.totalRevenue;
  });

  return augmentedProducts.slice(0, limit).map((entry) => entry.product);
}

/**
 * High-leverage unified analytics query:
 * Yields ready-to-render dashboard overview and operational intelligence.
 */
export function getDashboardOverview(
  orders: Order[],
  products: Product[],
  categories: Category[],
  range: DateRange,
  now: Date = new Date()
) {
  const rangeOrders = filterOrdersByRange(orders, range, now);
  const metrics = computeDashboardMetrics(orders, range, now);
  const series = buildOrderSeries(orders, range, now);
  const topSelling = deriveTopSellingProducts(orders, products, 6);
  const inventory = computeInventoryStats(products);

  return {
    rangeOrders,
    metrics,
    series,
    topSelling,
    inventory,
  };
}

import {
  Category,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
} from "@/types/admin";
import { resolveUnifiedOrderStatus } from "@/components/ui/status-badge";

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
  shortDate?: string;
  isToday?: boolean;
  revenue: number;
  orders: number;
}

/**
 * Builds revenue/order buckets straight from real orders:
 * - 7d: 7 daily points ending on Today
 * - 30d: 30 daily points ending on Today (enables smooth live curves without 6-day lagging blocks)
 * - 6m: 6 calendar months ending on the current month
 */
export function buildOrderSeries(
  orders: Order[],
  range: DateRange,
  now: Date = new Date()
): OrderSeriesPoint[] {
  const buckets: {
    label: string;
    shortDate: string;
    isToday: boolean;
    from: number;
    to: number;
  }[] = [];

  if (range === "6m") {
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const isCurrentMonth = i === 0;
      const monthLabel = start.toLocaleDateString("en-US", { month: "short" });
      buckets.push({
        label: isCurrentMonth ? `${monthLabel} (Live)` : monthLabel,
        shortDate: monthLabel,
        isToday: isCurrentMonth,
        from: start.getTime(),
        to: end.getTime(),
      });
    }
  } else {
    const today = startOfDay(now).getTime();
    // 7 days for 7d; 30 daily points for 30d (providing true live daily resolution)
    const days = range === "7d" ? 7 : 30;

    for (let i = days - 1; i >= 0; i -= 1) {
      const dayStart = today - i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const isToday = i === 0;
      const formattedDate = new Date(dayStart).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      buckets.push({
        label: isToday ? "Today" : formattedDate,
        shortDate: formattedDate,
        isToday,
        from: dayStart,
        to: dayEnd,
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

    return {
      label: bucket.label,
      shortDate: bucket.shortDate,
      isToday: bucket.isToday,
      revenue,
      orders: inBucket.length,
    };
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
  paid: number;
  expired: number;
  failed: number;
  cancelled: number;
  pendingShare: number;
  paidShare: number;
  expiredShare: number;
  failedShare: number;
  cancelledShare: number;
  /** Deprecated backwards-compatibility fields */
  processing: number;
  completed: number;
  processingShare: number;
  completedShare: number;
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

  let pending = 0;
  let paid = 0;
  let expired = 0;
  let failed = 0;
  let cancelled = 0;

  for (const o of current) {
    const key = resolveUnifiedOrderStatus(o.orderStatus, o.paymentStatus, o.paymentMethod);
    if (key === "paid") paid++;
    else if (key === "pending") pending++;
    else if (key === "expired") expired++;
    else if (key === "failed") failed++;
    else if (key === "cancelled") cancelled++;
  }

  const totalOrders = current.length;
  const share = (count: number) =>
    totalOrders === 0 ? 0 : Math.round((count / totalOrders) * 100);

  return {
    revenue,
    previousRevenue,
    revenueChange: percentChange(revenue, previousRevenue),
    totalOrders,
    ordersChange: percentChange(totalOrders, previous.length),
    pending,
    paid,
    expired,
    failed,
    cancelled,
    pendingShare: share(pending),
    paidShare: share(paid),
    expiredShare: share(expired),
    failedShare: share(failed),
    cancelledShare: share(cancelled),
    processing: 0,
    processingShare: 0,
    completed: paid,
    completedShare: share(paid),
    avgOrderValue: billable.length > 0 ? revenue / billable.length : 0,
    paidPayments: paid,
    pendingPayments: pending,
    failedPayments: failed + expired,
    topPayment: topShare(
      current
        .map((o) => o.paymentMethod)
        .filter((method): method is NonNullable<typeof method> => Boolean(method && method.trim()))
    ),
    topCity: topShare(
      current
        .map((o) => o.city)
        .filter((city): city is NonNullable<typeof city> => Boolean(city && city.trim()))
    ),
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
  const statuses: PaymentStatus[] = ["Paid", "Pending", "Failed", "Expired"];

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
  orderCount?: number;
}

export function computeCategorySales(
  categories: Category[],
  products: Product[],
  palette: string[] = ["#D96B91", "#E99AB5", "#F2B6CA", "#F8DDE5", "#806B73"],
  orders?: Order[]
): CategoryRevenueItem[] {
  // If orders are provided, compute authoritative category sales from actual order line items
  if (orders && orders.length > 0) {
    const totals = new Map<string, { revenue: number; orderCount: number }>();
    let uncategorizedRevenue = 0;
    let uncategorizedCount = 0;

    for (const order of orders) {
      if (order.orderStatus === "Cancelled") continue;

      for (const item of order.items || []) {
        const quantity = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const lineRev = quantity * unitPrice;

        const matchedProduct = products.find((p) => {
          if (item.productId && (p.id === item.productId || p.slug === item.productId)) {
            return true;
          }
          if (
            item.productName &&
            p.name &&
            p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()
          ) {
            return true;
          }
          if (
            item.productName &&
            p.name &&
            (p.name.toLowerCase().includes(item.productName.trim().toLowerCase()) ||
              item.productName.toLowerCase().includes(p.name.trim().toLowerCase()))
          ) {
            return true;
          }
          return false;
        });

        if (matchedProduct) {
          const targetCat = categories.find(
            (c) =>
              c.id === matchedProduct.categoryId ||
              c.slug === matchedProduct.categoryId ||
              c.name.trim().toLowerCase() === matchedProduct.categoryId.trim().toLowerCase()
          );
          const catKey = targetCat ? targetCat.id : matchedProduct.categoryId;
          const current = totals.get(catKey) ?? { revenue: 0, orderCount: 0 };
          totals.set(catKey, {
            revenue: current.revenue + lineRev,
            orderCount: current.orderCount + quantity,
          });
        } else {
          uncategorizedRevenue += lineRev;
          uncategorizedCount += quantity;
        }
      }
    }

    const result: CategoryRevenueItem[] = categories.map((cat, idx) => {
      const stats =
        totals.get(cat.id) ??
        totals.get(cat.slug) ??
        totals.get(cat.name) ?? { revenue: 0, orderCount: 0 };

      return {
        name: cat.name,
        revenue: stats.revenue,
        orderCount: stats.orderCount,
        color: palette[idx % palette.length],
      };
    });

    if (uncategorizedRevenue > 0) {
      result.push({
        name: "Other / Custom",
        revenue: uncategorizedRevenue,
        orderCount: uncategorizedCount,
        color: palette[result.length % palette.length],
      });
    }

    return result;
  }

  // Fallback when orders are not provided: derive from products soldCount
  return categories.map((cat, idx) => {
    const catProducts = products.filter(
      (p) =>
        p.categoryId === cat.id ||
        p.categoryId === cat.slug ||
        p.categoryId === cat.name
    );
    const revenue = catProducts.reduce(
      (sum, p) => sum + (p.soldCount || 0) * (p.salePrice ?? p.regularPrice),
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

export interface TopSellingProduct {
  product: Product;
  /** Units actually ordered for this product in the supplied order set. */
  unitsSold: number;
  /** Revenue from order line items (quantity × unit price at purchase). */
  revenue: number;
}

export interface TopSellingOptions {
  limit?: number;
  /** "revenue" ranks by money earned, "units" ranks by unit velocity. */
  sortBy?: "revenue" | "units";
}

/** Links an order line item back to a catalog product. */
function findProductForItem(
  item: OrderItem,
  products: Product[]
): Product | undefined {
  return products.find((p) => {
    if (
      item.productId &&
      (p.id === item.productId || p.slug === item.productId)
    ) {
      return true;
    }
    if (item.productName && p.name) {
      const itemName = item.productName.trim().toLowerCase();
      const productName = p.name.trim().toLowerCase();
      if (!itemName) return false;
      if (itemName === productName) return true;
      if (productName.includes(itemName) || itemName.includes(productName)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Ranks products from real order line items. Units and revenue come from what
 * customers actually ordered (cancellations excluded), never from a catalog
 * `soldCount` baseline or today's list price.
 */
export function deriveTopSellingProducts(
  orders: Order[],
  products: Product[] = [],
  { limit = 10, sortBy = "units" }: TopSellingOptions = {}
): TopSellingProduct[] {
  const productMetrics = new Map<
    string,
    { product: Product; unitsSold: number; revenue: number }
  >();

  for (const order of revenueOrders(orders)) {
    for (const item of order.items || []) {
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) continue;

      const matchedProduct = findProductForItem(item, products);
      const productKey = matchedProduct?.id || item.productId || item.productName;
      if (!productKey) continue;

      const existing = productMetrics.get(productKey);
      if (existing) {
        existing.unitsSold += quantity;
        existing.revenue += quantity * (Number(item.unitPrice) || 0);
      } else {
        const fallbackProduct: Product = matchedProduct ?? {
          id: item.productId || productKey,
          slug: item.productId || productKey,
          name: item.productName || "Product",
          description: "",
          categoryId: "",
          brand: "Pretty Corner",
          sku: item.sku || productKey,
          regularPrice: Number(item.unitPrice) || 0,
          images: item.productImage
            ? [item.productImage]
            : ["/assets/dew-drop-serum.png"],
          stock: 0,
          lowStockThreshold: 10,
          status: "Active",
          soldCount: 0,
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: order.createdAt || new Date().toISOString(),
        };

        productMetrics.set(productKey, {
          product: fallbackProduct,
          unitsSold: quantity,
          revenue: quantity * (Number(item.unitPrice) || 0),
        });
      }
    }
  }

  const ranked: TopSellingProduct[] = Array.from(productMetrics.values());

  ranked.sort((a, b) =>
    sortBy === "revenue"
      ? b.revenue - a.revenue || b.unitsSold - a.unitsSold
      : b.unitsSold - a.unitsSold || b.revenue - a.revenue
  );

  return ranked.slice(0, limit);
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
  const topSelling = deriveTopSellingProducts(rangeOrders, products, { limit: 6 });
  const inventory = computeInventoryStats(products);

  return {
    rangeOrders,
    metrics,
    series,
    topSelling,
    inventory,
  };
}

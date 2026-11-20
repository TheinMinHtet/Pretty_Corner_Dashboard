import { Order } from "@/types/admin";

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

const DAY = 86_400_000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Inclusive start timestamp for a dashboard range. */
export function rangeStart(range: DateRange, now: Date = new Date()): number {
  if (range === "7d") return startOfDay(now).getTime() - 6 * DAY;
  if (range === "30d") return startOfDay(now).getTime() - 29 * DAY;
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
      const start = today - startOffset * DAY;
      buckets.push({
        label:
          range === "7d"
            ? new Date(start).toLocaleDateString("en-US", { weekday: "short" })
            : new Date(start).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
        from: start,
        to: today - endOffset * DAY + DAY,
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
  return revenueOrders(orders).reduce((sum, order) => sum + order.total, 0);
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

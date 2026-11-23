"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Order, OrderStatus } from "@/types/admin";
import { formatCompactMMK, formatMMK } from "@/lib/utils";
import {
  buildOrderSeries,
  DateRange,
  DATE_RANGE_LABELS,
} from "@/modules/analytics/metrics";

import {
  resolveUnifiedOrderStatus,
  UNIFIED_STATUS_CONFIG,
} from "@/components/ui/status-badge";

export const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: "#F59E0B",
  Confirmed: "#38BDF8",
  Processing: "#A78BFA",
  Shipped: "#10B981",
  Expired: "#64748B",
  Cancelled: "#F43F5E",
};

const UNIFIED_STATUS_COLORS: Record<string, string> = {
  Paid: "#10B981",
  Pending: "#F59E0B",
  Cancelled: "#F43F5E",
  "Time Expired": "#64748B",
  Failed: "#EF4444",
};

function getOrderUnifiedCategory(o: Order): string {
  const key = resolveUnifiedOrderStatus(o.orderStatus, o.paymentStatus, o.paymentMethod);
  return UNIFIED_STATUS_CONFIG[key].label;
}

export function RevenueChartCard({
  orders,
  range,
}: {
  orders: Order[];
  range: DateRange;
}) {
  const data = useMemo(
    () => buildOrderSeries(orders, range),
    [orders, range]
  );

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Revenue Overview</CardTitle>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <CardDescription>
            Gross boutique sales for the {DATE_RANGE_LABELS[range]} (updated live through Today) in MMK
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="h-[280px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="pinkRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E99AB5" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#E99AB5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#F0E1E6"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              interval="preserveStartEnd"
              tick={{ fill: "#806B73", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompactMMK(Number(v)).replace(" MMK", "")}
              tick={{ fill: "#806B73", fontSize: 11 }}
              width={54}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload as (typeof data)[0];
                return (
                  <div className="rounded-xl border border-[#F0E1E6] bg-white p-3 shadow-md text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#38262E]">
                      <span>{point.shortDate || point.label}</span>
                      {point.isToday && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Today · Live
                        </span>
                      )}
                    </div>
                    <p className="text-[#806B73]">
                      Revenue:{" "}
                      <span className="font-bold text-[#B73D67]">
                        {formatMMK(point.revenue)}
                      </span>
                    </p>
                    <p className="text-[#806B73]">
                      Orders:{" "}
                      <span className="font-bold text-[#38262E]">
                        {point.orders}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#B73D67"
              strokeWidth={2.5}
              fill="url(#pinkRevenueGrad)"
              activeDot={{ r: 5, fill: "#B73D67", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OrdersTrendCard({
  orders,
  range,
}: {
  orders: Order[];
  range: DateRange;
}) {
  const data = useMemo(
    () => buildOrderSeries(orders, range),
    [orders, range]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle>Orders Over Time</CardTitle>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <CardDescription>
          Order volume over the {DATE_RANGE_LABELS[range]} (updated live through Today)
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[240px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#F0E1E6"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={16}
              interval="preserveStartEnd"
              tick={{ fill: "#806B73", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#806B73", fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload as (typeof data)[0];
                return (
                  <div className="rounded-xl border border-[#F0E1E6] bg-white p-2.5 shadow-md text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#38262E]">
                      <span>{point.shortDate || point.label}</span>
                      {point.isToday && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Today · Live
                        </span>
                      )}
                    </div>
                    <p className="text-[#806B73]">
                      Orders:{" "}
                      <span className="font-bold text-[#38262E]">
                        {point.orders}
                      </span>
                    </p>
                    <p className="text-[#806B73]">
                      Revenue:{" "}
                      <span className="font-bold text-[#B73D67]">
                        {formatMMK(point.revenue)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="orders"
              radius={[4, 4, 0, 0]}
              maxBarSize={range === "30d" ? 22 : 36}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isToday ? "#B73D67" : "#E99AB5"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OrderStatusDistributionCard({
  orders,
  title = "Order Status Distribution",
  description,
  className,
}: {
  orders: Order[];
  title?: string;
  description?: string;
  className?: string;
}) {
  const distribution = useMemo(() => {
    const categories = [
      "Paid",
      "Pending",
      "Cancelled",
      "Time Expired",
      "Failed",
    ];
    const counts: Record<string, number> = {};
    categories.forEach((c) => (counts[c] = 0));

    orders.forEach((o) => {
      const cat = getOrderUnifiedCategory(o);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = orders.length;

    return categories
      .map((name) => ({
        name,
        value: counts[name] || 0,
        percentage: total > 0 ? Math.round(((counts[name] || 0) / total) * 100) : 0,
        color: UNIFIED_STATUS_COLORS[name],
      }))
      .filter((d) => d.value > 0);
  }, [orders]);

  const totalOrders = orders.length;

  return (
    <Card className={`rounded-[32px] border-[#F0E1E6] bg-white shadow-xs ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg font-bold text-[#33272C]">{title}</CardTitle>
        <CardDescription className="text-xs text-[#806B73]">
          {description ?? `Real-time live breakdown across ${totalOrders} orders`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {totalOrders === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm font-semibold text-[#33272C]">No orders recorded</p>
            <p className="text-xs text-[#806B73]">New orders will automatically distribute here</p>
          </div>
        ) : (
          <>
            <div className="h-[190px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #F0E1E6",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                    formatter={(val, name, item) => [
                      `${val} orders (${(item as { payload: { percentage: number } }).payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Donut Total Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-[#33272C] leading-none">{totalOrders}</span>
                <span className="text-[10px] uppercase font-bold text-[#806B73] tracking-wider mt-0.5">Orders</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-[#F5EBF0]">
              {distribution.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-1.5 text-[#806B73] truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span className="font-bold text-[#33272C]">{item.value}</span>
                    <span className="text-[10px] text-[#806B73]">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

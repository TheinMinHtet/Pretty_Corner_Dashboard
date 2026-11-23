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

const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: "#F59E0B",
  Confirmed: "#38BDF8",
  Processing: "#A78BFA",
  Shipped: "#E99AB5",
  Delivered: "#10B981",
  Cancelled: "#F43F5E",
};

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

export function OrderStatusDistributionCard({ orders }: { orders: Order[] }) {
  const distribution = useMemo(() => {
    const statuses: OrderStatus[] = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
    ];
    return statuses
      .map((status) => ({
        name: status,
        value: orders.filter((o) => o.orderStatus === status).length,
        color: STATUS_COLORS[status],
      }))
      .filter((d) => d.value > 0);
  }, [orders]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Order Status Distribution</CardTitle>
        <CardDescription>Current breakdown across {orders.length} orders</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
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
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
          {distribution.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5 text-[#806B73]">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </span>
              <span className="font-semibold text-[#33272C]">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

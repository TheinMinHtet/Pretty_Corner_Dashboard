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
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>
            Gross boutique sales for the {DATE_RANGE_LABELS[range]} in MMK
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
              tick={{ fill: "#806B73", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompactMMK(Number(v)).replace(" MMK", "")}
              tick={{ fill: "#806B73", fontSize: 11 }}
              width={54}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #F0E1E6",
                boxShadow: "0 4px 12px rgba(51,39,44,0.08)",
                fontSize: "12px",
              }}
              formatter={(value) => [formatMMK(Number(value ?? 0)), "Revenue"]}
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
        <CardTitle>Orders Over Time</CardTitle>
        <CardDescription>
          Order volume over the {DATE_RANGE_LABELS[range]}
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
              tick={{ fill: "#806B73", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#806B73", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #F0E1E6",
                fontSize: "12px",
              }}
              formatter={(value) => [`${value ?? 0} orders`, "Orders"]}
            />
            <Bar
              dataKey="orders"
              fill="#E99AB5"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
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

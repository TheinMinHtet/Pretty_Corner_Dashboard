"use client";

import React, { useMemo, useState } from "react";
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
  Banknote,
  ShoppingBag,
  TrendingUp,
  Calendar,
  CreditCard,
  Users,
  Repeat,
} from "lucide-react";
import { useAdminStore } from "@/context/admin-store";
import { OrderStatus } from "@/types/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompactMMK, formatMMK } from "@/lib/utils";
import {
  buildOrderSeries,
  DateRange,
  filterOrdersByRange,
  sumRevenue,
  computePaymentMethodStats,
  computePaymentStatusStats,
} from "@/modules/analytics/metrics";

const CATEGORY_COLORS = ["#D96B91", "#E99AB5", "#F2B6CA", "#F8DDE5", "#806B73"];
const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: "#F59E0B",
  Confirmed: "#38BDF8",
  Processing: "#A78BFA",
  Shipped: "#E99AB5",
  Delivered: "#10B981",
  Cancelled: "#F43F5E",
};

export default function SalesReportsPage() {
  const { orders, products, categories, customers } = useAdminStore();
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const rangeOrders = useMemo(
    () => filterOrdersByRange(orders, dateRange),
    [orders, dateRange]
  );

  // Payment Breakdown Analytics (PC-SD-008)
  const paymentMethodStats = useMemo(
    () => computePaymentMethodStats(rangeOrders),
    [rangeOrders]
  );

  const paymentStatusStats = useMemo(
    () => computePaymentStatusStats(rangeOrders),
    [rangeOrders]
  );

  // Customer Segmentation Analytics (PC-SD-007)
  const customerRetentionStats = useMemo(() => {
    const customerOrderCounts: Record<string, { count: number; spend: number }> =
      {};
    for (const o of rangeOrders) {
      if (!customerOrderCounts[o.customerId]) {
        customerOrderCounts[o.customerId] = { count: 0, spend: 0 };
      }
      customerOrderCounts[o.customerId].count += 1;
      if (o.orderStatus !== "Cancelled") {
        customerOrderCounts[o.customerId].spend += o.total;
      }
    }

    let newCustCount = 0;
    let returningCustCount = 0;
    let newCustSpend = 0;
    let returningCustSpend = 0;

    for (const c of customers) {
      const stats = customerOrderCounts[c.id] || { count: 0, spend: 0 };
      if (stats.count === 0) continue;
      if (stats.count > 1) {
        returningCustCount += 1;
        returningCustSpend += stats.spend;
      } else {
        newCustCount += 1;
        newCustSpend += stats.spend;
      }
    }

    const totalCust = newCustCount + returningCustCount || 1;
    const repeatRate = Math.round((returningCustCount / totalCust) * 100);

    return {
      newCustCount,
      returningCustCount,
      newCustSpend,
      returningCustSpend,
      repeatRate,
    };
  }, [customers, rangeOrders]);

  const trendData = useMemo(
    () => buildOrderSeries(rangeOrders, dateRange),
    [rangeOrders, dateRange]
  );

  const summary = useMemo(() => {
    const totalRev = sumRevenue(rangeOrders);
    const totalOrd = rangeOrders.length;
    const aov = totalOrd > 0 ? totalRev / totalOrd : 0;
    return { totalRev, totalOrd, aov };
  }, [rangeOrders]);

  const salesByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const order of rangeOrders) {
      if (order.orderStatus === "Cancelled") continue;
      for (const item of order.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;
        totals.set(
          product.categoryId,
          (totals.get(product.categoryId) ?? 0) + item.quantity * item.unitPrice
        );
      }
    }
    return categories.map((cat, idx) => ({
      name: cat.name,
      revenue: totals.get(cat.id) ?? 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [categories, products, rangeOrders]);

  const ordersByStatus = useMemo(() => {
    const statuses: OrderStatus[] = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];
    return statuses
      .map((s) => ({
        name: s,
        value: rangeOrders.filter((o) => o.orderStatus === s).length,
        color: STATUS_COLORS[s],
      }))
      .filter((d) => d.value > 0);
  }, [rangeOrders]);

  const bestSellers = useMemo(
    () =>
      [...products]
        .sort((a, b) => b.soldCount - a.soldCount)
        .slice(0, 6),
    [products]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            Sales Reports & Analytics
          </h2>
          <p className="text-sm text-[#806B73]">
            Evaluate revenue growth, category performance, and order conversion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#806B73]" />
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRange)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#806B73]">Total Revenue</p>
              <p className="text-2xl font-bold text-[#33272C] mt-1">
                {formatMMK(summary.totalRev)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#FCEEF2] flex items-center justify-center">
              <Banknote className="h-5 w-5 text-[#D96B91]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#806B73]">Total Orders</p>
              <p className="text-2xl font-bold text-[#33272C] mt-1">
                {summary.totalOrd.toLocaleString("en-US")}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-sky-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#806B73]">Average Order Value</p>
              <p className="text-2xl font-bold text-[#33272C] mt-1">
                {formatMMK(summary.aov)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>Sales performance over selected period</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="reportPinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D96B91" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#D96B91" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0E1E6" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#806B73", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  formatCompactMMK(Number(v)).replace(" MMK", "")
                }
                tick={{ fill: "#806B73", fontSize: 11 }}
                width={54}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #F0E1E6",
                  fontSize: "12px",
                }}
                formatter={(value) => [formatMMK(Number(value ?? 0)), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D96B91"
                strokeWidth={2.5}
                fill="url(#reportPinkGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales by Category + Orders by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Cumulative revenue per beauty category</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByCategory} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0E1E6" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    formatCompactMMK(Number(v)).replace(" MMK", "")
                  }
                  tick={{ fill: "#806B73", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#33272C", fontSize: 12 }}
                  width={115}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #F0E1E6",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [formatMMK(Number(value ?? 0)), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#E99AB5" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Current active order distribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {ordersByStatus.map((entry) => (
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
            <div className="grid grid-cols-3 gap-2 mt-2">
              {ordersByStatus.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-[#806B73] truncate">{s.name}:</span>
                  <span className="font-semibold text-[#33272C]">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment & Customer Segmentation Analytics (PC-SD-007, PC-SD-008) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods & Transaction Breakdown */}
        <Card className="rounded-[32px] border-[#F0E1E6]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#D96B91]" />
                  Payment Channels & Settlements
                </CardTitle>
                <CardDescription>
                  Volume and revenue distribution across payment providers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {/* Status overview badges */}
            <div className="grid grid-cols-4 gap-2">
              {paymentStatusStats.map((st) => (
                <div
                  key={st.name}
                  className="rounded-2xl border border-[#F0E1E6] bg-[#FDF6F8] p-2.5 text-center"
                >
                  <p className="text-[10px] text-[#806B73] font-semibold">{st.name}</p>
                  <p
                    className="text-base font-bold mt-0.5"
                    style={{ color: st.color }}
                  >
                    {st.count}
                  </p>
                </div>
              ))}
            </div>

            {/* Methods breakdown list */}
            <div className="space-y-2.5 pt-1">
              {paymentMethodStats.map((pm) => (
                <div
                  key={pm.name}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-[#F0E1E6]/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: pm.color }}
                    />
                    <div>
                      <p className="font-semibold text-[#33272C]">{pm.name}</p>
                      <p className="text-[10px] text-[#806B73]">
                        {pm.count} {pm.count === 1 ? "order" : "orders"} processed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#33272C]">
                      {formatMMK(pm.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Segmentation & Retention */}
        <Card className="rounded-[32px] border-[#F0E1E6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-[#D96B91]" />
              Customer Retention & Segmentation
            </CardTitle>
            <CardDescription>
              First-time buyers vs. repeat beauty enthusiasts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {/* Hero Retention Metric */}
            <div className="rounded-2xl border border-[#F0E1E6] bg-[#FCEEF2]/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#806B73] font-semibold flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5 text-[#D96B91]" />
                  Repeat Customer Rate
                </p>
                <p className="text-3xl font-black text-[#33272C] mt-1">
                  {customerRetentionStats.repeatRate}%
                </p>
                <p className="text-[11px] text-[#806B73] mt-0.5">
                  Proportion of customers with 2+ completed purchases
                </p>
              </div>
              <div className="h-14 w-14 rounded-full bg-white border border-[#F0E1E6] flex items-center justify-center font-serif text-lg font-bold text-[#D96B91] shadow-xs">
                {customerRetentionStats.returningCustCount}/
                {customerRetentionStats.newCustCount +
                  customerRetentionStats.returningCustCount}
              </div>
            </div>

            {/* Split cards: New vs Returning */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#F0E1E6] bg-white p-3.5 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  New Shoppers
                </span>
                <p className="text-xl font-bold text-[#33272C] pt-1">
                  {customerRetentionStats.newCustCount}
                </p>
                <p className="text-[11px] text-[#806B73]">
                  Revenue: {formatCompactMMK(customerRetentionStats.newCustSpend)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#F0E1E6] bg-white p-3.5 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCEEF2] text-[#D96B91] border border-[#F0E1E6]">
                  Returning Shoppers
                </span>
                <p className="text-xl font-bold text-[#33272C] pt-1">
                  {customerRetentionStats.returningCustCount}
                </p>
                <p className="text-[11px] text-[#806B73]">
                  Revenue:{" "}
                  {formatCompactMMK(customerRetentionStats.returningCustSpend)}
                </p>
              </div>
            </div>

            {/* Progress Bar Distribution */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-[#806B73]">
                <span>New ({100 - customerRetentionStats.repeatRate}%)</span>
                <span>Returning ({customerRetentionStats.repeatRate}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-sky-100 overflow-hidden flex">
                <div
                  className="bg-sky-400 h-full"
                  style={{ width: `${100 - customerRetentionStats.repeatRate}%` }}
                />
                <div
                  className="bg-[#D96B91] h-full"
                  style={{ width: `${customerRetentionStats.repeatRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best-Selling Products Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Best-Selling Products</CardTitle>
          <CardDescription>Top revenue-generating items</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Est. Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bestSellers.map((p) => {
                const price = p.salePrice ?? p.regularPrice;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-[#33272C]">
                      {p.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#806B73]">
                      {p.sku}
                    </TableCell>
                    <TableCell>{p.soldCount}</TableCell>
                    <TableCell>{formatMMK(price)}</TableCell>
                    <TableCell className="text-right font-semibold text-[#D96B91]">
                      {formatMMK(p.soldCount * price)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

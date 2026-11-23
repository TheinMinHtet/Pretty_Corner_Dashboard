"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
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
import dynamic from "next/dynamic";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { CatalogIndexItem, Order, Product } from "@/types/admin";
import { ChartCardSkeleton } from "@/components/charts/dashboard-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CategorySalesCard = dynamic(
  () =>
    import("@/components/charts/category-sales-card").then(
      (m) => m.CategorySalesCard
    ),
  {
    ssr: false,
    loading: () => <ChartCardSkeleton className="h-full" height="h-[320px]" />,
  }
);

const OrderStatusDistributionCard = dynamic(
  () =>
    import("@/components/charts/dashboard-charts").then(
      (m) => m.OrderStatusDistributionCard
    ),
  {
    ssr: false,
    loading: () => <ChartCardSkeleton className="h-full" height="h-[320px]" />,
  }
);
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
  DEFAULT_CATEGORY_PALETTE,
  filterOrdersByRange,
  sumRevenue,
  computeCategorySales,
  computePaymentMethodStats,
  computePaymentStatusStats,
  deriveTopSellingProducts,
} from "@/modules/analytics/metrics";
import { SalesReportsPageSkeleton } from "@/components/skeletons/reports-skeletons";

export default function SalesReportsPage() {
  const { orders, products, categories, catalogIndex, hydrated } = useAdminStore();
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [localCatalogIndex, setLocalCatalogIndex] = useState<CatalogIndexItem[]>([]);

  useEffect(() => {
    if (catalogIndex && catalogIndex.length > 0) return;
    let active = true;
    fetch("/api/products?view=index")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.products) setLocalCatalogIndex(data.products);
      })
      .catch((err) => console.error("Failed to load catalog index for reports:", err));
    return () => {
      active = false;
    };
  }, [catalogIndex]);

  const activeCatalog =
    catalogIndex && catalogIndex.length > 0 ? catalogIndex : localCatalogIndex;

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

  const totalPaymentOrders = useMemo(
    () => paymentMethodStats.reduce((sum, pm) => sum + pm.count, 0),
    [paymentMethodStats]
  );

  const totalPaymentRevenue = useMemo(
    () => paymentMethodStats.reduce((sum, pm) => sum + pm.revenue, 0),
    [paymentMethodStats]
  );

  // Customer Segmentation Analytics (PC-SD-007)
  // Classification uses each customer's LIFETIME purchase history, so a loyal
  // shopper who happens to order once inside the selected window is still a
  // returning buyer. Revenue is attributed to the selected window.
  const customerRetentionStats = useMemo(() => {
    const isCompletedPurchase = (o: Order) =>
      o.orderStatus !== "Cancelled" &&
      (o.orderStatus === "Shipped" || o.paymentStatus === "Paid");

    const lifetimePurchases = new Map<string, number>();
    for (const o of orders) {
      if (!isCompletedPurchase(o)) continue;
      lifetimePurchases.set(
        o.customerId,
        (lifetimePurchases.get(o.customerId) ?? 0) + 1
      );
    }

    const windowSpend = new Map<string, number>();
    for (const o of rangeOrders) {
      if (o.orderStatus === "Cancelled") continue;
      windowSpend.set(
        o.customerId,
        (windowSpend.get(o.customerId) ?? 0) + o.total
      );
    }

    let newCustCount = 0;
    let returningCustCount = 0;
    let newCustSpend = 0;
    let returningCustSpend = 0;

    for (const [customerId, spend] of windowSpend) {
      const completedPurchases = lifetimePurchases.get(customerId) ?? 0;
      if (completedPurchases >= 2) {
        returningCustCount += 1;
        returningCustSpend += spend;
      } else {
        newCustCount += 1;
        newCustSpend += spend;
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
  }, [orders, rangeOrders]);

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
    return computeCategorySales(
      categories,
      activeCatalog.length > 0 ? activeCatalog : products,
      DEFAULT_CATEGORY_PALETTE,
      rangeOrders
    );
  }, [categories, activeCatalog, products, rangeOrders]);

  const bestSellers = useMemo(
    () =>
      deriveTopSellingProducts(
        rangeOrders,
        activeCatalog.length > 0
          ? (activeCatalog as unknown as Product[])
          : products,
        {
          limit: 6,
          sortBy: "revenue",
        }
      ),
    [rangeOrders, activeCatalog, products]
  );

  if (!hydrated) {
    return <SalesReportsPageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            {t.reportsPageTitle}
          </h2>
          <p className="text-sm text-[#806B73]">
            {t.reportsPageSubtitle}
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
              <SelectItem value="7d">{t.range7d}</SelectItem>
              <SelectItem value="30d">{t.range30d}</SelectItem>
              <SelectItem value="6m">{t.range6m}</SelectItem>
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
          <CardTitle>{t.revenueTrendsTitle}</CardTitle>
          <CardDescription>{t.revenueTrendsDesc}</CardDescription>
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
                minTickGap={24}
                interval="preserveStartEnd"
                tick={{ fill: "#806B73", fontSize: 11 }}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <CategorySalesCard
          salesData={salesByCategory}
          totalRevenue={summary.totalRev}
          dateRange={dateRange}
          className="h-full"
        />

        <OrderStatusDistributionCard
          orders={rangeOrders}
          title={t.ordersByStatusTitle}
          description={t.ordersByStatusDesc}
          className="h-full"
        />
      </div>

      {/* Payment & Customer Segmentation Analytics (PC-SD-007, PC-SD-008) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Payment Methods & Transaction Breakdown */}
        <Card className="rounded-[32px] border-[#F0E1E6] flex flex-col h-full bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#F5EDF0]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-[#38262E]">
                  <CreditCard className="h-4 w-4 text-[#D96B91]" />
                  {t.paymentChannelsTitle}
                </CardTitle>
                <CardDescription className="text-xs text-[#7A6870]">
                  {t.paymentChannelsDesc}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
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
            <div className="space-y-3 pt-1">
              {paymentMethodStats.map((pm) => {
                const countShare =
                  totalPaymentOrders > 0
                    ? Math.round((pm.count / totalPaymentOrders) * 100)
                    : 0;
                const revenueShare =
                  totalPaymentRevenue > 0
                    ? Math.round((pm.revenue / totalPaymentRevenue) * 100)
                    : 0;
                return (
                  <div
                    key={pm.name}
                    className="p-3.5 rounded-2xl bg-[#FAF7F8]/60 border border-[#F0E1E6]/80 text-xs transition-all hover:bg-white hover:shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: pm.color }}
                        />
                        <div>
                          <p className="font-bold text-[#38262E] text-sm">{pm.name}</p>
                          <p className="text-[11px] text-[#7A6870] mt-0.5">
                            {pm.count} {pm.count === 1 ? "order" : "orders"} processed ({countShare}% volume)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-sm text-[#38262E]">
                          {formatMMK(pm.revenue)}
                        </p>
                        <p className="text-[10px] text-[#7A6870] mt-0.5 font-medium">
                          {revenueShare}% revenue share
                        </p>
                      </div>
                    </div>
                    {/* Share progress track */}
                    <div className="h-1.5 w-full rounded-full bg-[#EEDFE5]/50 overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${revenueShare}%`,
                          backgroundColor: pm.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom summary footer for balanced visual weight */}
            <div className="flex items-center justify-between text-[11px] text-[#7A6870] pt-2 border-t border-[#F0E1E6]/60">
              <span>Total Processed: <strong className="text-[#38262E] font-bold">{totalPaymentOrders} orders</strong></span>
              <span>Total Settlements: <strong className="text-[#38262E] font-bold">{formatMMK(totalPaymentRevenue)}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Segmentation & Retention */}
        <Card className="rounded-[32px] border-[#F0E1E6] flex flex-col h-full bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#F5EDF0]">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#38262E]">
              <Users className="h-4 w-4 text-[#D96B91]" />
              {t.customerRetentionTitle}
            </CardTitle>
            <CardDescription className="text-xs text-[#7A6870]">
              {t.customerRetentionDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
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
                  Active shoppers with 2+ completed purchases (all time)
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
                  Period revenue:{" "}
                  {formatCompactMMK(customerRetentionStats.newCustSpend)}
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
                  Period revenue:{" "}
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
          <CardTitle>{t.bestSellingProductsTitle}</CardTitle>
          <CardDescription>
            {t.bestSellingProductsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead>Avg. Unit Price</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bestSellers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-xs text-[#806B73]"
                  >
                    No sales in the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                bestSellers.map(({ product, unitsSold, revenue }) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium text-[#33272C]">
                      {product.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#806B73]">
                      {product.sku}
                    </TableCell>
                    <TableCell>{unitsSold}</TableCell>
                    <TableCell>
                      {formatMMK(unitsSold > 0 ? revenue / unitsSold : 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#D96B91]">
                      {formatMMK(revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

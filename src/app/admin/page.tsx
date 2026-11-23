"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Banknote,
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Package,
  Eye,
} from "lucide-react";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { Product } from "@/types/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UnifiedOrderStatusBadge,
} from "@/components/ui/status-badge";
import {
  OrderStatusDistributionCard,
  OrdersTrendCard,
  RevenueChartCard,
} from "@/components/charts/dashboard-charts";
import { formatDate, formatMMK } from "@/lib/utils";
import {
  DATE_RANGES,
  DateRange,
  filterOrdersByRange,
  computeDashboardMetrics,
  deriveTopSellingProducts,
} from "@/modules/analytics/metrics";

export default function AdminDashboardPage() {
  const { orders, products, categories } = useAdminStore();
  const { t } = useLanguage();
  const [range, setRange] = useState<DateRange>("30d");

  const rangeOrders = useMemo(
    () => filterOrdersByRange(orders, range),
    [orders, range]
  );

  const metrics = useMemo(() => {
    return computeDashboardMetrics(orders, range);
  }, [orders, range]);

  const changeLabel = (change: number | null) =>
    change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [orders]
  );

  const bestSellingProducts = useMemo(
    () =>
      deriveTopSellingProducts(rangeOrders, products, {
        limit: 5,
        sortBy: "units",
      }),
    [rangeOrders, products]
  );

  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  React.useEffect(() => {
    let active = true;
    fetch("/api/products?stock=low&limit=5&status=Active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setLowStockProducts(data.products || []);
      })
      .catch((err) => console.error("Failed to load dashboard low stock products:", err));
    return () => {
      active = false;
    };
  }, []);

  const localizedDateRangeLabels: Record<DateRange, string> = {
    "7d": t.range7d,
    "30d": t.range30d,
    "6m": t.range6m,
  };

  const kpis = [
    {
      title: t.totalSales,
      value: formatMMK(metrics.revenue),
      change: changeLabel(metrics.revenueChange),
      positive: (metrics.revenueChange ?? 0) >= 0,
      comparison: `vs ${formatMMK(metrics.previousRevenue)}`,
      icon: Banknote,
      accentBg: "bg-[#FCEEF2]",
      accentText: "text-[#D96B91]",
      width: 100,
    },
    {
      title: t.totalOrders,
      value: metrics.totalOrders.toLocaleString("en-US"),
      change: changeLabel(metrics.ordersChange),
      positive: (metrics.ordersChange ?? 0) >= 0,
      comparison: localizedDateRangeLabels[range],
      icon: ShoppingBag,
      accentBg: "bg-sky-50",
      accentText: "text-sky-600",
      width: 100,
    },
    {
      title: t.pendingOrders,
      value: String(metrics.pending),
      change: `${metrics.pending}`,
      positive: metrics.pendingShare <= 20,
      comparison: `${metrics.pendingShare}% (${t.totalOrders})`,
      icon: Clock,
      accentBg: "bg-amber-50",
      accentText: "text-amber-600",
      width: metrics.pendingShare,
    },
    {
      title: t.statusProcessing,
      value: String(metrics.processing),
      change: `${metrics.processing}`,
      positive: true,
      comparison: `${metrics.processingShare}%`,
      icon: Package,
      accentBg: "bg-violet-50",
      accentText: "text-violet-600",
      width: metrics.processingShare,
    },
    {
      title: t.statusShipped,
      value: String(metrics.completed),
      change: `${metrics.completedShare}%`,
      positive: true,
      comparison: `${metrics.completed}`,
      icon: CheckCircle2,
      accentBg: "bg-emerald-50",
      accentText: "text-emerald-600",
      width: metrics.completedShare,
    },
  ];

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name ?? "Uncategorized";

  return (
    <div className="space-y-6">
      {/* Welcome / Quick Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C] tracking-tight">
            Pretty Corner Overview
          </h2>
          <p className="text-sm text-[#806B73]">
            Monitor daily sales, order fulfillment, and beauty inventory at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#F0E1E6] bg-[#FDF6F8] p-0.5">
            {DATE_RANGES.map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  range === option.value
                    ? "bg-white text-[#D96B91] shadow-2xs font-semibold"
                    : "text-[#806B73] hover:text-[#33272C]"
                }`}
              >
                {localizedDateRangeLabels[option.value] ?? option.label}
              </button>
            ))}
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/orders">{t.navOrders}</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">+ {t.navNewProduct}</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-xs font-medium text-[#806B73]">
                      {kpi.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#33272C] truncate">
                      {kpi.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.accentBg}`}
                  >
                    <Icon className={`h-5 w-5 ${kpi.accentText}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      kpi.positive ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {kpi.positive ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {kpi.change}
                  </span>
                  <span className="text-[#806B73] truncate">{kpi.comparison}</span>
                </div>
                <div className="mt-3 h-1 w-full rounded-full bg-[#FDF6F8] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#E99AB5] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, kpi.width))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Revenue (2 cols) + Order Status Distribution (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueChartCard orders={rangeOrders} range={range} />
        <OrderStatusDistributionCard orders={rangeOrders} />
      </div>

      {/* Charts Row 2: Orders Trend + Sales Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OrdersTrendCard orders={rangeOrders} range={range} />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales Summary</CardTitle>
                <CardDescription>
                  {localizedDateRangeLabels[range]}
                </CardDescription>
              </div>
              <span className="text-xs font-semibold text-[#B73D67] bg-[#FCEEF2] px-2.5 py-1 rounded-full">
                {metrics.totalOrders} Orders
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-[#FDF6F8] border border-[#F0E1E6] p-3.5">
              <p className="text-xs text-[#806B73]">{t.revenueCol}</p>
              <p className="text-lg font-bold text-[#33272C] mt-0.5">
                {formatMMK(metrics.revenue)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#F0E1E6] p-3">
                <p className="text-[11px] text-[#806B73]">{t.avgOrderValue}</p>
                <p className="text-sm font-semibold text-[#33272C] mt-0.5">
                  {formatMMK(metrics.avgOrderValue)}
                </p>
              </div>
              <div className="rounded-xl border border-[#F0E1E6] p-3">
                <p className="text-[11px] text-[#806B73]">{t.activeProducts}</p>
                <p className="text-sm font-semibold text-[#33272C] mt-0.5">
                  {products.filter((p) => p.status === "Active").length}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5">
                <p className="text-[11px] text-emerald-700">{t.payPaid}</p>
                <p className="text-sm font-semibold text-emerald-800">
                  {metrics.paidPayments}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2.5">
                <p className="text-[11px] text-amber-700">{t.payPending}</p>
                <p className="text-sm font-semibold text-amber-800">
                  {metrics.pendingPayments}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-2.5">
                <p className="text-[11px] text-rose-700">{t.payFailed}</p>
                <p className="text-sm font-semibold text-rose-800">
                  {metrics.failedPayments}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0E1E6]">
              <span className="text-[#806B73]">Top payment method</span>
              <Badge variant="default">
                {metrics.topPayment
                  ? `${metrics.topPayment.value} (${metrics.topPayment.share}%)`
                  : "—"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#806B73]">Top city</span>
              <span className="font-semibold text-[#33272C]">
                {metrics.topCity
                  ? `${metrics.topCity.value} (${metrics.topCity.share}%)`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Best Selling Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 rounded-[28px] border-[#EEDFE5] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 border-b border-[#EEDFE5]/60 bg-[#FAF7F8]">
            <div>
              <CardTitle className="text-sm font-semibold text-[#38262E]">{t.recentOrders}</CardTitle>
              <CardDescription className="text-xs text-[#7A6870]">{t.recentOrdersDesc}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders" className="text-[#B73D67] font-semibold hover:underline flex items-center gap-1 text-xs">
                {t.viewAllOrders} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#FAF7F8]/80">
                <TableRow>
                  <TableHead className="pl-4 font-semibold text-[#38262E]">{t.orderCol}</TableHead>
                  <TableHead className="font-semibold text-[#38262E]">{t.customerCol}</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold text-[#38262E]">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold text-[#38262E]">Date</TableHead>
                  <TableHead className="font-semibold text-[#38262E]">{t.totalCol}</TableHead>
                  <TableHead className="font-semibold text-[#38262E]">{t.statusCol}</TableHead>
                  <TableHead className="text-right pr-4 font-semibold text-[#38262E]">{t.actionCol}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-[#FAF7F8]/60 transition-colors">
                    <TableCell className="font-semibold pl-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[#B73D67] hover:underline"
                      >
                        {order.reference}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#38262E] text-sm">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-[#7A6870]">
                          {order.township}, {order.city}
                        </p>
                        {order.nearbyLandmark && (
                          <p className="text-[10px] text-amber-800 italic">
                            Near {order.nearbyLandmark}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-[#7A6870]">
                      {order.customerPhone}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-[#7A6870]">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap text-[#38262E]">
                      {formatMMK(order.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <UnifiedOrderStatusBadge
                          orderStatus={order.orderStatus}
                          paymentStatus={order.paymentStatus}
                          paymentMethod={order.paymentMethod}
                        />
                        <span className="text-[10px] text-[#7A6870] pl-0.5">
                          {order.paymentMethod}
                        </span>
                        {order.transactionReference && (
                          <span className="text-[10px] font-mono text-[#B73D67] pl-0.5 truncate max-w-[130px]">
                            {order.transactionReference}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button variant="ghost" size="sm" asChild aria-label={`View order ${order.reference}`}>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="h-4 w-4 text-[#B73D67]" />
                          <span className="hidden sm:inline text-xs text-[#B73D67] font-medium">View</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Best-Selling Products */}
        <Card className="rounded-[28px] border-[#EEDFE5] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 border-b border-[#EEDFE5]/60 bg-[#FAF7F8]">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-[#38262E]">
                <Sparkles className="h-4 w-4 text-[#B73D67]" /> {t.topSellingProducts}
              </CardTitle>
              <CardDescription className="text-xs text-[#7A6870]">{t.topSellingDesc}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/products" className="text-[#B73D67] font-semibold hover:underline text-xs">
                {t.navProducts}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {bestSellingProducts.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#806B73]">
                No sales in the selected period.
              </p>
            ) : (
              bestSellingProducts.map(({ product, unitsSold }) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[#F0E1E6]/80 p-2.5 hover:bg-[#FCEEF2]/40 transition-colors"
                >
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-lg object-cover border border-[#F0E1E6] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#33272C] truncate">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-[#806B73]">
                      {getCategoryName(product.categoryId)} · {unitsSold}{" "}
                      {t.unitsSoldCol}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#D96B91] whitespace-nowrap">
                    {formatMMK(product.salePrice ?? product.regularPrice)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> {t.lowStockAlert}
              </CardTitle>
              <CardDescription>
                Products at or below reorder threshold
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/inventory" className="text-[#D96B91]">
                {t.viewAllInventory} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-[#806B73] py-6 text-center">
                All active products are well stocked.
              </p>
            ) : (
              lowStockProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#F0E1E6] px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Image
                      src={item.images[0]}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg border border-[#F0E1E6] shrink-0 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#33272C] truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-[#806B73]">
                        SKU: {item.sku} · Threshold: {item.lowStockThreshold}
                      </p>
                    </div>
                  </div>
                  <Badge variant={item.stock === 0 ? "destructive" : "warning"}>
                    {item.stock === 0 ? t.outOfStock : `${item.stock} left`}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

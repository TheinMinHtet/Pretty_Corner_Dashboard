"use client";

import React, { useMemo } from "react";
import Link from "next/link";
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
  Activity,
} from "lucide-react";
import { useAdminStore } from "@/context/admin-store";
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
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/ui/status-badge";
import {
  OrderStatusDistributionCard,
  OrdersTrendCard,
  RevenueChartCard,
} from "@/components/charts/dashboard-charts";
import { formatDate, formatDateTime, formatMMK } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { orders, products, categories, activity } = useAdminStore();

  const metrics = useMemo(() => {
    const validOrders = orders.filter((o) => o.orderStatus !== "Cancelled");
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
    // Combine live orders with baseline historical boutique revenue for realistic MMK scale
    const displayRevenue = 11520000 + totalRevenue;
    const totalOrdersCount = 222 + orders.length;
    const pendingCount = orders.filter((o) => o.orderStatus === "Pending").length;
    const completedCount =
      188 + orders.filter((o) => o.orderStatus === "Delivered").length;
    const avgOrderValue =
      validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    return {
      displayRevenue,
      totalOrdersCount,
      pendingCount,
      completedCount,
      avgOrderValue,
      liveRevenue: totalRevenue,
    };
  }, [orders]);

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
      [...products]
        .filter((p) => p.status !== "Archived")
        .sort((a, b) => b.soldCount - a.soldCount)
        .slice(0, 5),
    [products]
  );

  const lowStockProducts = useMemo(
    () =>
      products
        .filter(
          (p) => p.status === "Active" && p.stock <= p.lowStockThreshold
        )
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5),
    [products]
  );

  const kpis = [
    {
      title: "Total Revenue",
      value: formatMMK(metrics.displayRevenue),
      change: "+14.2%",
      positive: true,
      comparison: "vs 10,590,000 MMK last month",
      icon: Banknote,
      accentBg: "bg-[#FCEEF2]",
      accentText: "text-[#D96B91]",
      barWidth: "w-4/5",
    },
    {
      title: "Total Orders",
      value: metrics.totalOrdersCount.toLocaleString("en-US"),
      change: "+9.8%",
      positive: true,
      comparison: "vs 209 orders last month",
      icon: ShoppingBag,
      accentBg: "bg-sky-50",
      accentText: "text-sky-600",
      barWidth: "w-3/4",
    },
    {
      title: "Pending Orders",
      value: String(metrics.pendingCount),
      change: metrics.pendingCount > 2 ? "+1 new" : "-2.4%",
      positive: metrics.pendingCount <= 2,
      comparison: "Awaiting confirmation",
      icon: Clock,
      accentBg: "bg-amber-50",
      accentText: "text-amber-600",
      barWidth: "w-2/5",
    },
    {
      title: "Completed Orders",
      value: metrics.completedCount.toLocaleString("en-US"),
      change: "+11.5%",
      positive: true,
      comparison: "96.4% fulfillment rate",
      icon: CheckCircle2,
      accentBg: "bg-emerald-50",
      accentText: "text-emerald-600",
      barWidth: "w-5/6",
    },
  ];

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name ?? "Beauty";

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
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/orders">Manage Orders</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">+ Add Product</Link>
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                    className={`h-full rounded-full bg-[#E99AB5] ${kpi.barWidth}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Revenue (2 cols) + Order Status Distribution (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueChartCard />
        <OrderStatusDistributionCard orders={orders} />
      </div>

      {/* Charts Row 2: Orders Trend + Sales Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OrdersTrendCard />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Sales Summary</CardTitle>
            <CardDescription>Recent active order batch metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-[#FDF6F8] border border-[#F0E1E6] p-3.5">
              <p className="text-xs text-[#806B73]">Recent Batch Revenue</p>
              <p className="text-lg font-bold text-[#33272C] mt-0.5">
                {formatMMK(metrics.liveRevenue)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#F0E1E6] p-3">
                <p className="text-[11px] text-[#806B73]">Avg. Order Value</p>
                <p className="text-sm font-semibold text-[#33272C] mt-0.5">
                  {formatMMK(metrics.avgOrderValue)}
                </p>
              </div>
              <div className="rounded-xl border border-[#F0E1E6] p-3">
                <p className="text-[11px] text-[#806B73]">Active Catalog</p>
                <p className="text-sm font-semibold text-[#33272C] mt-0.5">
                  {products.filter((p) => p.status === "Active").length} products
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0E1E6]">
              <span className="text-[#806B73]">Top payment method</span>
              <Badge variant="default">KBZPay (42%)</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#806B73]">Top city</span>
              <span className="font-semibold text-[#33272C]">Yangon (84%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Best Selling Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest customer purchases</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders" className="text-[#D96B91]">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[#D96B91] hover:underline"
                      >
                        {order.reference}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#33272C] text-sm">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-[#806B73]">
                          {order.township}, {order.city}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {formatMMK(order.total)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.orderStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Best-Selling Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#D96B91]" /> Best Sellers
              </CardTitle>
              <CardDescription>Top performing beauty items</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/products" className="text-[#D96B91]">
                Catalog
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bestSellingProducts.map((product) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="flex items-center gap-3 rounded-xl border border-[#F0E1E6]/80 p-2.5 hover:bg-[#FCEEF2]/40 transition-colors"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-11 w-11 rounded-lg object-cover border border-[#F0E1E6] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#33272C] truncate">
                    {product.name}
                  </p>
                  <p className="text-[11px] text-[#806B73]">
                    {getCategoryName(product.categoryId)} · {product.soldCount} sold
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#D96B91] whitespace-nowrap">
                  {formatMMK(product.salePrice ?? product.regularPrice)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Low-Stock
                Alerts
              </CardTitle>
              <CardDescription>
                Products at or below reorder threshold
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/inventory" className="text-[#D96B91]">
                Manage Stock <ArrowRight className="h-3.5 w-3.5" />
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
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="h-10 w-10 rounded-lg border border-[#F0E1E6] shrink-0"
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
                    {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-[#D96B91]" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest admin & warehouse actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-[#F0E1E6]/60 pb-2.5 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#33272C]">
                    {item.action}
                  </p>
                  <p className="text-xs text-[#806B73] mt-0.5">{item.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-medium text-[#33272C]">
                    {item.actor}
                  </p>
                  <p className="text-[10px] text-[#806B73]">
                    {formatDateTime(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

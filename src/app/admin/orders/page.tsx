"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpDown,
  Eye,
  Filter,
  Printer,
  Truck,
  CheckSquare,
  Square,
  CheckCircle,
  RefreshCw,
  Clock,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { Order } from "@/types/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  OrdersPageSkeleton,
  OrdersTableSkeleton,
} from "@/components/skeletons/orders-skeletons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UnifiedStatusSelector,
  UNIFIED_STATUS_CONFIG,
  UnifiedStatusKey,
} from "@/components/ui/status-badge";
import { PaginationControl } from "@/components/ui/pagination";
import { formatDate, formatMMK, cn } from "@/lib/utils";

const UNIFIED_STATUS_OPTIONS = [
  "All",
  "Pending",
  "Paid",
  "Failed",
  "Time Expired",
  "Cancelled",
] as const;

type UnifiedStatusOption = (typeof UNIFIED_STATUS_OPTIONS)[number];

type OrderDateFilter = "all" | "today" | "yesterday" | "7d" | "30d";
type OrderSortOption =
  | "newest"
  | "oldest"
  | "highest_value"
  | "lowest_value"
  | "reference_asc";

export default function OrdersPage() {
  const {
    orders: storeOrders,
    updateUnifiedStatus,
    globalSearch,
    setGlobalSearch,
    refreshData,
    hydrated,
  } = useAdminStore();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [unifiedFilter, setUnifiedFilter] = useState<UnifiedStatusOption>("All");
  const [townshipFilter, setTownshipFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<OrderDateFilter>("all");
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>("all");
  const [highValueOnly, setHighValueOnly] = useState(false);
  const [sortOption, setSortOption] = useState<OrderSortOption>("newest");
  const [page, setPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const pageSize = 10;

  // Server-side paginated orders state
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [townships, setTownships] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pick up the header global search once, then clear it.
  useEffect(() => {
    if (globalSearch.trim()) {
      setSearch(globalSearch.trim());
      setGlobalSearch("");
      setPage(1);
    }
  }, [globalSearch, setGlobalSearch]);

  const { sortField, sortDir } = useMemo(() => {
    switch (sortOption) {
      case "oldest":
        return { sortField: "createdAt" as const, sortDir: "asc" as const };
      case "highest_value":
        return { sortField: "total" as const, sortDir: "desc" as const };
      case "lowest_value":
        return { sortField: "total" as const, sortDir: "asc" as const };
      case "reference_asc":
        return { sortField: "reference" as const, sortDir: "asc" as const };
      case "newest":
      default:
        return { sortField: "createdAt" as const, sortDir: "desc" as const };
    }
  }, [sortOption]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sortField,
        sortDir,
      });
      if (search.trim()) sp.set("q", search.trim());
      if (unifiedFilter !== "All") sp.set("unifiedStatus", unifiedFilter);
      if (townshipFilter !== "All") sp.set("township", townshipFilter);
      if (dateFilter !== "all") sp.set("dateFilter", dateFilter);
      if (deliveryMethodFilter !== "all") sp.set("deliveryMethod", deliveryMethodFilter);
      if (highValueOnly) sp.set("highValueOnly", "true");

      const res = await fetch(`/api/orders?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data.orders || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (Array.isArray(data.allTownships) && data.allTownships.length > 0) {
          setTownships(data.allTownships);
        }
      } else {
        toast.error("Failed to load orders");
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    sortField,
    sortDir,
    search,
    unifiedFilter,
    townshipFilter,
    dateFilter,
    deliveryMethodFilter,
    highValueOnly,
  ]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      await fetchOrders();
      toast.success("Orders revalidated from database");
    } catch {
      toast.error("Failed to refresh orders");
    } finally {
      setIsRefreshing(false);
    }
  };

  const allTownships = useMemo(() => {
    if (townships.length > 0) return townships;
    const set = new Set<string>();
    storeOrders.forEach((o) => {
      if (o.township && o.township.trim()) set.add(o.township.trim());
    });
    return Array.from(set).sort();
  }, [townships, storeOrders]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (unifiedFilter !== "All") count++;
    if (townshipFilter !== "All") count++;
    if (dateFilter !== "all") count++;
    if (deliveryMethodFilter !== "all") count++;
    if (highValueOnly) count++;
    if (sortOption !== "newest") count++;
    return count;
  }, [search, unifiedFilter, townshipFilter, dateFilter, deliveryMethodFilter, highValueOnly, sortOption]);

  const handleResetFilters = () => {
    setSearch("");
    setUnifiedFilter("All");
    setTownshipFilter("All");
    setDateFilter("all");
    setDeliveryMethodFilter("all");
    setHighValueOnly(false);
    setSortOption("newest");
    setPage(1);
  };

  const isAllPageSelected = useMemo(() => {
    if (ordersList.length === 0) return false;
    return ordersList.every((o) => selectedOrderIds.includes(o.id));
  }, [ordersList, selectedOrderIds]);

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedOrderIds((prev) =>
        prev.filter((id) => !ordersList.some((o) => o.id === id))
      );
    } else {
      const pageIds = ordersList.map((o) => o.id);
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedOrdersList = useMemo(() => {
    return ordersList.filter((o) => selectedOrderIds.includes(o.id));
  }, [ordersList, selectedOrderIds]);

  const handleBatchUnifiedStatus = (targetStatus: UnifiedStatusKey) => {
    if (selectedOrderIds.length === 0) return;
    selectedOrderIds.forEach((id) => {
      updateUnifiedStatus(id, targetStatus);
    });
    const label = UNIFIED_STATUS_CONFIG[targetStatus].label;
    toast.success(
      `Updated ${selectedOrderIds.length} orders to ${label}`
    );
    setSelectedOrderIds([]);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSingleStatusChange = (
    orderId: string,
    newKey: UnifiedStatusKey,
    reference: string
  ) => {
    updateUnifiedStatus(orderId, newKey);
    const label = UNIFIED_STATUS_CONFIG[newKey].label;
    toast.success(`Order ${reference} updated to ${label}`);
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!hydrated && ordersList.length === 0) {
    return <OrdersPageSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            {t.ordersPageTitle}
          </h2>
          <p className="text-sm text-[#806B73]">
            {t.ordersPageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#806B73]">
          <span className="rounded-full border border-[#F0E1E6] bg-white px-3.5 py-1 font-semibold text-[#33272C] flex items-center gap-1.5 shadow-xs">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-[#B73D67]" />}
            <span>{total} orders found</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 px-3 rounded-xl border-[#F0E1E6] bg-white text-[#33272C] hover:bg-[#FDF2F5] hover:text-[#B73D67] text-xs font-medium cursor-pointer transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Modern Perplexity Filter Console */}
      <Card className="rounded-[24px] border border-[#EEDFE5] bg-white shadow-xs overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          {/* Top row: Search, Township, Status, Method, Sort, and Reset */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A6870]" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Order ID, customer, phone, landmark..."
                className="pl-10 h-10 rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/60 focus:bg-white text-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Township */}
              <div className="w-[145px]">
                <Select
                  value={townshipFilter}
                  onValueChange={(v) => {
                    setTownshipFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <MapPin className="h-3.5 w-3.5 text-[#B73D67] mr-1 shrink-0" />
                    <SelectValue placeholder="Township" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Townships</SelectItem>
                    {allTownships.map((town) => (
                      <SelectItem key={town} value={town}>
                        {town}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="w-[145px]">
                <Select
                  value={unifiedFilter}
                  onValueChange={(v) => {
                    setUnifiedFilter(v as UnifiedStatusOption);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIFIED_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        Status: {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Method */}
              <div className="w-[140px]">
                <Select
                  value={deliveryMethodFilter}
                  onValueChange={(v) => {
                    setDeliveryMethodFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <Truck className="h-3.5 w-3.5 text-[#B73D67] mr-1 shrink-0" />
                    <SelectValue placeholder="Delivery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                    <SelectItem value="pickup">Store Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Business Sort Selector */}
              <div className="w-[190px]">
                <Select
                  value={sortOption}
                  onValueChange={(v) => {
                    setSortOption(v as OrderSortOption);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#B73D67] mr-1 shrink-0" />
                    <SelectValue placeholder="Sort orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First (Recent)</SelectItem>
                    <SelectItem value="oldest">Oldest First (FIFO)</SelectItem>
                    <SelectItem value="highest_value">Most Spending (High Total)</SelectItem>
                    <SelectItem value="lowest_value">Lowest Total</SelectItem>
                    <SelectItem value="reference_asc">Order ID (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset button */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-10 px-3 text-xs text-[#806B73] hover:text-[#B73D67] hover:bg-[#FCEEF2] rounded-xl"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>

          {/* Bottom row: Time Order & Business Range Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-semibold text-[#806B73] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Time Range:
            </span>
            <button
              type="button"
              onClick={() => {
                setDateFilter("all");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                dateFilter === "all"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilter("today");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                dateFilter === "today"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilter("yesterday");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                dateFilter === "yesterday"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilter("7d");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                dateFilter === "7d"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilter("30d");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                dateFilter === "30d"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              Last 30 Days
            </button>

            <div className="h-4 w-px bg-[#EEDFE5] mx-1 hidden sm:block" />

            {/* High Value Toggle Pill */}
            <button
              type="button"
              onClick={() => {
                setHighValueOnly(!highValueOnly);
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1",
                highValueOnly
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              <Sparkles className="h-3 w-3" />
              High Value (&gt;100k MMK)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="rounded-[28px] border-[#EEDFE5] overflow-hidden shadow-xs">
        <CardHeader className="pb-2.5 px-5 flex flex-row items-center justify-between border-b border-[#EEDFE5]/60 bg-[#FAF7F8]">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#38262E]">
            <Filter className="h-4 w-4 text-[#B73D67]" />
            {t.ordersListTitle}
          </CardTitle>
          {selectedOrderIds.length > 0 && (
            <span className="text-xs font-semibold text-[#B73D67] bg-[#FCEEF2] px-2.5 py-1 rounded-full">
              {selectedOrderIds.length} selected
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && ordersList.length === 0 ? (
            <OrdersTableSkeleton rowCount={10} />
          ) : ordersList.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F8] text-[#B73D67] mb-2 border border-[#EEDFE5]">
                <Truck className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-[#38262E]">
                No orders match your criteria
              </p>
              <p className="text-xs text-[#7A6870] mt-1">
                Try adjusting your date range, status, or search query.
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl border-[#EEDFE5]"
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#FAF7F8]/80">
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <button
                      type="button"
                      onClick={toggleSelectAllPage}
                      className="p-1 hover:text-[#B73D67] text-[#7A6870] cursor-pointer"
                      aria-label={isAllPageSelected ? "Deselect all on this page" : "Select all on this page"}
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="h-4 w-4 text-[#B73D67]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <span className="font-semibold text-[#38262E]">Order ID</span>
                  </TableHead>
                  <TableHead className="font-semibold text-[#38262E]">Customer</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold text-[#38262E]">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold text-[#38262E]">Date</TableHead>
                  <TableHead className="font-semibold text-[#38262E]">Total</TableHead>
                  <TableHead className="font-semibold text-[#38262E]">Status</TableHead>
                  <TableHead className="text-right pr-4 font-semibold text-[#38262E]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn("transition-opacity duration-200", isLoading && "opacity-40 pointer-events-none")}>
                {ordersList.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <TableRow key={order.id} className={isSelected ? "bg-[#FCEEF2]/30" : "hover:bg-[#FAF7F8]/60 transition-colors"}>
                      <TableCell className="w-10 pl-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(order.id)}
                          className="p-1 hover:text-[#B73D67] text-[#7A6870] cursor-pointer"
                          aria-label={`Select order ${order.reference}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-[#B73D67]" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-semibold font-mono">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-[#B73D67] hover:underline"
                        >
                          {order.reference}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-[#38262E]">
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
                      <TableCell className="hidden md:table-cell text-xs font-mono text-[#7A6870]">
                        {order.customerPhone}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-[#7A6870]">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap text-[#38262E]">
                        {formatMMK(order.total)}
                        {order.total >= 100000 && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FCEEF2] text-[#B73D67]">
                            High Value
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <UnifiedStatusSelector
                            orderStatus={order.orderStatus}
                            paymentStatus={order.paymentStatus}
                            paymentMethod={order.paymentMethod}
                            onStatusChange={(newKey) =>
                              handleSingleStatusChange(
                                order.id,
                                newKey,
                                order.reference
                              )
                            }
                          />
                          <div className="flex items-center gap-1.5 text-[10px] text-[#7A6870] pl-0.5">
                            <span>{order.paymentMethod}</span>
                            {order.deliveryMethod && (
                              <>
                                <span>·</span>
                                <span className="capitalize">{order.deliveryMethod}</span>
                              </>
                            )}
                            {order.transactionReference && (
                              <>
                                <span>·</span>
                                <span className="font-mono text-[#B73D67] truncate max-w-[110px]">
                                  {order.transactionReference}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button variant="ghost" size="sm" asChild aria-label={`View order ${order.reference}`}>
                          <Link href={`/admin/orders/${order.id}`} className="text-[#B73D67] hover:bg-[#FCEEF2] rounded-lg">
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1 font-medium text-xs">View</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* On-Demand Server-Side Pagination */}
          <PaginationControl
            page={page}
            totalPages={totalPages}
            totalItems={total}
            limit={pageSize}
            isLoading={isLoading}
            onPageChange={setPage}
            itemLabel="orders"
            className="border-t border-[#EEDFE5] px-4 py-3"
          />
        </CardContent>
      </Card>

      {/* Floating Batch Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#38262E] text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-semibold pl-1">
            {selectedOrderIds.length} orders selected
          </span>
          <div className="h-4 w-px bg-white/20" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchUnifiedStatus("paid")}
            className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg cursor-pointer"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            Set Paid
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchUnifiedStatus("pending")}
            className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5 mr-1 text-amber-400" />
            Set Pending
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBatchUnifiedStatus("expired")}
            className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg cursor-pointer"
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1 text-slate-300" />
            Set Expired
          </Button>
          <Button
            size="sm"
            onClick={() => setManifestModalOpen(true)}
            className="h-8 text-xs bg-[#B73D67] hover:bg-[#982F53] text-white rounded-lg shadow-sm"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Courier Manifest
          </Button>
          <button
            type="button"
            onClick={() => setSelectedOrderIds([])}
            className="text-xs text-white/60 hover:text-white hover:underline ml-1 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Printable Courier Dispatch Manifest Modal */}
      <Dialog open={manifestModalOpen} onOpenChange={setManifestModalOpen}>
        <DialogContent className="max-w-3xl rounded-[24px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-serif font-semibold text-[#38262E] flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#B73D67]" />
                Pretty Corner — Courier Delivery Manifest
              </DialogTitle>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-[#B73D67] hover:bg-[#982F53] text-white print:hidden rounded-xl"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Manifest
              </Button>
            </div>
            <DialogDescription className="text-xs text-[#7A6870]">
              Generated on {formatDate(new Date().toISOString())} · {selectedOrdersList.length} parcels scheduled for delivery riders
            </DialogDescription>
          </DialogHeader>

          <div className="border border-[#EEDFE5] rounded-2xl overflow-hidden mt-3 text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#FAF7F8] border-b border-[#EEDFE5] text-[#7A6870]">
                <tr>
                  <th className="p-2.5 font-medium">Order ID</th>
                  <th className="p-2.5 font-medium">Customer & Phone</th>
                  <th className="p-2.5 font-medium">Address & Landmark</th>
                  <th className="p-2.5 font-medium">Township</th>
                  <th className="p-2.5 font-medium">Payment</th>
                  <th className="p-2.5 font-medium text-right">Collect (MMK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEDFE5]/60">
                {selectedOrdersList.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FAF7F8]/40">
                    <td className="p-2.5 font-mono font-semibold text-[#B73D67]">{ord.reference}</td>
                    <td className="p-2.5">
                      <p className="font-semibold text-[#38262E]">{ord.customerName}</p>
                      <p className="text-[11px] text-[#7A6870] font-mono">{ord.customerPhone}</p>
                    </td>
                    <td className="p-2.5 max-w-[200px]">
                      <p className="text-[11px] text-[#38262E] line-clamp-2">{ord.deliveryAddress}</p>
                      {ord.nearbyLandmark && (
                        <p className="text-[10px] text-amber-800 italic mt-0.5">Near: {ord.nearbyLandmark}</p>
                      )}
                    </td>
                    <td className="p-2.5 font-medium text-[#38262E]">{ord.township}</td>
                    <td className="p-2.5">
                      <span className={ord.paymentMethod === "Cash on Delivery" ? "text-amber-800 font-semibold" : "text-emerald-700 font-medium"}>
                        {ord.paymentMethod === "Cash on Delivery" ? "Collect COD" : "Prepaid"}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-semibold whitespace-nowrap">
                      {ord.paymentMethod === "Cash on Delivery" ? formatMMK(ord.total) : "0 MMK"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManifestModalOpen(false)}
              className="rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

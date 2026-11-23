"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Printer,
  Truck,
  CheckSquare,
  Square,
  CheckCircle,
  RefreshCw,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
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
  resolveUnifiedOrderStatus,
} from "@/components/ui/status-badge";
import { formatDate, formatMMK } from "@/lib/utils";

const UNIFIED_STATUS_OPTIONS = [
  "All",
  "Pending",
  "Paid",
  "Failed",
  "Time Expired",
  "Cancelled",
] as const;

type UnifiedStatusOption = (typeof UNIFIED_STATUS_OPTIONS)[number];

type SortField = "createdAt" | "total" | "reference";
type SortDir = "asc" | "desc";

export default function OrdersPage() {
  const {
    orders,
    updateUnifiedStatus,
    globalSearch,
    setGlobalSearch,
    refreshData,
  } = useAdminStore();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success("Orders revalidated from database");
    } catch {
      toast.error("Failed to refresh orders");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pick up the header global search (PC-AD shell) once, then clear it.
  useEffect(() => {
    if (globalSearch.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the shared search store
      setSearch(globalSearch.trim());
      setGlobalSearch("");
    }
  }, [globalSearch, setGlobalSearch]);
  const [unifiedFilter, setUnifiedFilter] = useState<UnifiedStatusOption>("All");
  const [townshipFilter, setTownshipFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [clientNow, setClientNow] = useState<number | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const pageSize = 6;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client clock for hydration-safe "today" filters
    setClientNow(Date.now());
  }, []);

  const allTownships = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.township && o.township.trim()) set.add(o.township.trim());
    });
    return Array.from(set).sort();
  }, [orders]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders
      .filter((o) => {
        if (unifiedFilter !== "All") {
          const currentKey = resolveUnifiedOrderStatus(
            o.orderStatus,
            o.paymentStatus,
            o.paymentMethod
          );
          if (unifiedFilter === "Pending" && currentKey !== "pending") return false;
          if (unifiedFilter === "Paid" && currentKey !== "paid") return false;
          if (unifiedFilter === "Failed" && currentKey !== "failed") return false;
          if (unifiedFilter === "Time Expired" && currentKey !== "expired") return false;
          if (unifiedFilter === "Cancelled" && currentKey !== "cancelled") return false;
        }
        if (townshipFilter !== "All" && o.township !== townshipFilter) return false;
        if (dateFilter !== "all" && clientNow !== null) {
          const days = dateFilter === "7d" ? 7 : 30;
          const diffDays =
            (clientNow - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > days) return false;
        }
        if (q) {
          const match =
            o.reference.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.toLowerCase().includes(q) ||
            (o.transactionReference && o.transactionReference.toLowerCase().includes(q)) ||
            (o.nearbyLandmark && o.nearbyLandmark.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "createdAt") {
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortField === "total") {
          cmp = a.total - b.total;
        } else {
          cmp = a.reference.localeCompare(b.reference);
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [orders, search, unifiedFilter, townshipFilter, dateFilter, sortField, sortDir, clientNow]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const selectedOrdersList = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.id));
  }, [orders, selectedOrderIds]);

  const isAllPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedOrderIds.includes(o.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedOrderIds((prev) =>
        prev.filter((id) => !paginatedOrders.some((o) => o.id === id))
      );
    } else {
      const pageIds = paginatedOrders.map((o) => o.id);
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchUnifiedStatus = (status: UnifiedStatusKey) => {
    if (selectedOrderIds.length === 0) return;
    selectedOrderIds.forEach((id) => {
      updateUnifiedStatus(id, status, `Batch status transition to ${status}`);
    });
    toast.success(`Batch updated ${selectedOrderIds.length} orders to ${UNIFIED_STATUS_CONFIG[status].label}`);
    setSelectedOrderIds([]);
  };

  return (
    <div className="space-y-5">
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
          <span className="rounded-lg border border-[#F0E1E6] bg-white px-3 py-1.5 font-medium text-[#33272C]">
            {filteredOrders.length} orders found
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 px-3 rounded-lg border-[#F0E1E6] bg-white text-[#33272C] hover:bg-[#FDF2F5] hover:text-[#B73D67] text-xs font-medium cursor-pointer transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="rounded-[24px] border-[#EEDFE5]">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A6870]" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Order ID, customer, phone, landmark..."
                className="pl-9 h-10 rounded-xl"
              />
            </div>

            <Select
              value={townshipFilter}
              onValueChange={(v) => {
                setTownshipFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Township" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Townships ({allTownships.length})</SelectItem>
                {allTownships.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={unifiedFilter}
              onValueChange={(v) => {
                setUnifiedFilter(v as UnifiedStatusOption);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-xl">
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

            <Select
              value={dateFilter}
              onValueChange={(v) => {
                setDateFilter(v as "all" | "7d" | "30d");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="rounded-[28px] border-[#EEDFE5] overflow-hidden">
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
          {paginatedOrders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-[#38262E]">
                No orders match your filters
              </p>
              <p className="text-xs text-[#7A6870] mt-1">
                Try clearing your search or status filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl"
                onClick={() => {
                  setSearch("");
                  setTownshipFilter("All");
                  setUnifiedFilter("All");
                  setDateFilter("all");
                }}
              >
                Reset Filters
              </Button>
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
                  <TableHead aria-sort={sortField === "reference" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                    <button
                      onClick={() => toggleSort("reference")}
                      className="inline-flex items-center gap-1 hover:text-[#38262E] cursor-pointer"
                    >
                      Order ID <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead
                    className="hidden sm:table-cell"
                    aria-sort={sortField === "createdAt" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button
                      onClick={() => toggleSort("createdAt")}
                      className="inline-flex items-center gap-1 hover:text-[#38262E] cursor-pointer"
                    >
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead aria-sort={sortField === "total" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                    <button
                      onClick={() => toggleSort("total")}
                      className="inline-flex items-center gap-1 hover:text-[#38262E] cursor-pointer"
                    >
                      Total <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <TableRow key={order.id} className={isSelected ? "bg-[#FCEEF2]/30" : undefined}>
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
                      <TableCell className="font-semibold">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-[#B73D67] hover:underline"
                        >
                          {order.reference}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#38262E]">
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
                      <TableCell className="font-semibold whitespace-nowrap">
                        {formatMMK(order.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <UnifiedStatusSelector
                            orderStatus={order.orderStatus}
                            paymentStatus={order.paymentStatus}
                            paymentMethod={order.paymentMethod}
                            onStatusChange={(newKey) => {
                              updateUnifiedStatus(order.id, newKey);
                              const label = UNIFIED_STATUS_CONFIG[newKey].label;
                              toast.success(`Order ${order.reference} updated to ${label}`);
                            }}
                          />
                          <div className="flex items-center gap-1.5 text-[10px] text-[#7A6870] pl-0.5">
                            <span>{order.paymentMethod}</span>
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
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {filteredOrders.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#EEDFE5] px-4 py-3">
              <p className="text-xs text-[#7A6870]">
                Page {page} of {totalPages} · {filteredOrders.length} total orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Batch Action Bar (Daw Thandar Dispatch Accelerator) */}
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

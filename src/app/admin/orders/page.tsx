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
} from "lucide-react";
import { useAdminStore } from "@/context/admin-store";
import { OrderStatus, PaymentStatus } from "@/types/admin";
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
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/ui/status-badge";
import { formatDate, formatMMK } from "@/lib/utils";

const ORDER_STATUSES: ("All" | OrderStatus)[] = [
  "All",
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
];

const PAYMENT_STATUSES: ("All" | PaymentStatus)[] = [
  "All",
  "Pending",
  "Paid",
  "Failed",
  "Expired",
];

type SortField = "createdAt" | "total" | "reference";
type SortDir = "asc" | "desc";

export default function OrdersPage() {
  const { orders, globalSearch, setGlobalSearch } = useAdminStore();
  const [search, setSearch] = useState("");

  // Pick up the header global search (PC-AD shell) once, then clear it.
  useEffect(() => {
    if (globalSearch.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the shared search store
      setSearch(globalSearch.trim());
      setGlobalSearch("");
    }
  }, [globalSearch, setGlobalSearch]);
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [paymentFilter, setPaymentFilter] = useState<"All" | PaymentStatus>("All");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [clientNow, setClientNow] = useState<number | null>(null);
  const pageSize = 6;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client clock for hydration-safe "today" filters
    setClientNow(Date.now());
  }, []);

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
        if (statusFilter !== "All" && o.orderStatus !== statusFilter) return false;
        if (paymentFilter !== "All" && o.paymentStatus !== paymentFilter) return false;
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
  }, [orders, search, statusFilter, paymentFilter, dateFilter, sortField, sortDir, clientNow]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            Order Management
          </h2>
          <p className="text-sm text-[#806B73]">
            Track customer orders, verify payments, and update fulfillment stages.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#806B73]">
          <span className="rounded-lg border border-[#F0E1E6] bg-white px-3 py-1.5 font-medium text-[#33272C]">
            {filteredOrders.length} orders found
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by Order ID, customer name, or phone..."
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "All" | OrderStatus);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Order status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    Order: {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentFilter}
              onValueChange={(v) => {
                setPaymentFilter(v as "All" | PaymentStatus);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    Payment: {s}
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
              <SelectTrigger>
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
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#D96B91]" />
            Orders List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedOrders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-[#33272C]">
                No orders match your filters
              </p>
              <p className="text-xs text-[#806B73] mt-1">
                Try clearing your search or status filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setPaymentFilter("All");
                  setDateFilter("all");
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("reference")}
                      className="inline-flex items-center gap-1 hover:text-[#33272C] cursor-pointer"
                    >
                      Order ID <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort("createdAt")}
                      className="inline-flex items-center gap-1 hover:text-[#33272C] cursor-pointer"
                    >
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("total")}
                      className="inline-flex items-center gap-1 hover:text-[#33272C] cursor-pointer"
                    >
                      Total <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[#D96B91] hover:underline"
                      >
                        {order.reference}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#33272C]">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-[#806B73]">
                          {order.township}, {order.city}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-[#806B73]">
                      {order.customerPhone}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {formatMMK(order.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <PaymentStatusBadge status={order.paymentStatus} />
                        <span className="text-[10px] text-[#806B73] pl-1">
                          {order.paymentMethod}
                        </span>
                        {order.transactionReference && (
                          <span className="text-[10px] font-mono text-[#D96B91] pl-1 truncate max-w-[130px]">
                            {order.transactionReference}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.orderStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">View</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {filteredOrders.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#F0E1E6] px-4 py-3">
              <p className="text-xs text-[#806B73]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

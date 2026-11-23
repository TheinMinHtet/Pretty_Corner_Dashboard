"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Calendar,
  Navigation,
  Loader2,
} from "lucide-react";
import { useAdminStore } from "@/context/admin-store";
import { Customer } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { PaginationControl } from "@/components/ui/pagination";
import { formatDate, formatMMK } from "@/lib/utils";
import {
  CustomerDossier,
  getCustomerDossierByPhoneOrId,
} from "@/modules/customers/customer-dossier";

export default function CustomersPage() {
  const { customers: storeCustomers, orders } = useAdminStore();
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Server-side customer pagination (strictly max 10 per page)
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<CustomerDossier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (search.trim()) sp.set("q", search.trim());

      const res = await fetch(`/api/customers?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on query change
    fetchCustomers();
  }, [fetchCustomers]);

  const activeDetails = useMemo(() => {
    if (!selectedCustomer) return null;
    const dossier = getCustomerDossierByPhoneOrId(
      orders,
      selectedCustomer.id || selectedCustomer.phone,
      storeCustomers || []
    );
    if (!dossier) return null;
    return {
      ...dossier,
      custOrders: dossier.orders,
      totalOrders: dossier.orderCount,
      lastOrder: dossier.lastOrderDate,
    };
  }, [selectedCustomer, orders, storeCustomers]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            Customers
          </h2>
          <p className="text-sm text-[#806B73]">
            View loyal shoppers, order history, and saved delivery addresses.
          </p>
        </div>
        <span className="rounded-lg border border-[#F0E1E6] bg-white px-3 py-1.5 text-xs font-medium text-[#33272C] self-start">
          {total} customers
        </span>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search customer by name, phone, or email..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead className="hidden sm:table-cell">Last Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#806B73]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#D96B91]" />
                      <span className="text-xs">Fetching customer dossiers...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#806B73]">
                    <p className="text-sm font-medium text-[#33272C]">
                      No customers found
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCEEF2] text-xs font-semibold text-[#D96B91]">
                          {c.name
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <p className="font-semibold text-[#33272C]">{c.name}</p>
                          {c.email && (
                            <p className="text-xs text-[#806B73]">{c.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#33272C]">
                      {c.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{c.orderCount} orders</Badge>
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {formatMMK(c.totalSpent)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                      {c.lastOrderDate ? formatDate(c.lastOrderDate) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomer(c)}
                        className="h-8 text-xs font-medium"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View Dossier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Customer Pagination (Max 10 per page, server-fetched) */}
          <PaginationControl
            page={page}
            totalPages={totalPages}
            totalItems={total}
            limit={10}
            isLoading={isLoading}
            onPageChange={setPage}
            itemLabel="customers"
          />
        </CardContent>
      </Card>

      {/* Customer Detail Drawer */}
      <Sheet
        open={Boolean(selectedCustomer)}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {activeDetails && (
            <div className="space-y-6 pt-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FCEEF2] text-xl font-bold text-[#D96B91]">
                  {activeDetails.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg font-bold text-[#33272C] truncate">
                    {activeDetails.name}
                  </h3>
                  <div className="mt-1 space-y-1 text-xs text-[#806B73]">
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#D96B91]" />
                      <span>{activeDetails.phone}</span>
                    </p>
                    {activeDetails.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-[#D96B91]" />
                        <span className="truncate">{activeDetails.email}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#D96B91]" />
                      <span>
                        Customer since {formatDate(activeDetails.joinedAt)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#F0E1E6] bg-[#FDF6F8] p-3">
                  <p className="text-[11px] text-[#806B73]">Total Spent</p>
                  <p className="text-sm font-bold text-[#33272C] mt-0.5">
                    {formatMMK(activeDetails.totalSpent)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0E1E6] bg-[#FDF6F8] p-3">
                  <p className="text-[11px] text-[#806B73]">Total Orders</p>
                  <p className="text-sm font-bold text-[#33272C] mt-0.5">
                    {activeDetails.totalOrders}
                  </p>
                </div>
              </div>

              {/* Delivery Addresses */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#806B73] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#D96B91]" /> Delivery
                  Addresses
                </h4>
                {activeDetails.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-xl border border-[#F0E1E6] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#33272C]">
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                    <p className="text-[#806B73]">{addr.address}</p>
                    <p className="text-[#806B73]">
                      {addr.township}, {addr.city}
                    </p>
                    {addr.nearbyLandmark && (
                      <p className="text-[11px] text-[#D96B91] flex items-center gap-1 pt-0.5 font-medium">
                        <Navigation className="h-3 w-3 shrink-0" />
                        <span>Landmark: {addr.nearbyLandmark}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Order History */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#806B73] flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#D96B91]" /> Order
                  History
                </h4>
                {activeDetails.custOrders.length === 0 ? (
                  <p className="text-xs text-[#806B73]">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {activeDetails.custOrders.map((ord) => (
                      <Link
                        key={ord.id}
                        href={`/admin/orders/${ord.id}`}
                        className="block rounded-xl border border-[#F0E1E6] p-3 hover:bg-[#FCEEF2]/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#D96B91]">
                            {ord.reference}
                          </span>
                          <OrderStatusBadge status={ord.orderStatus} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-xs text-[#806B73]">
                          <span>{formatDate(ord.createdAt)}</span>
                          <span className="font-semibold text-[#33272C]">
                            {formatMMK(ord.total)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

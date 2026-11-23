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
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { Customer } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { PaginationControl } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMMK, cn } from "@/lib/utils";
import {
  CustomerDossier,
  getCustomerDossierByPhoneOrId,
} from "@/modules/customers/customer-dossier";

type CustomerTierFilter = "all" | "vip" | "repeat" | "new";
type CustomerSortOption =
  | "spent_desc"
  | "newest"
  | "orders_desc"
  | "recent_activity"
  | "name_asc"
  | "spent_asc";

export default function CustomersPage() {
  const { customers: storeCustomers, orders } = useAdminStore();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<CustomerTierFilter>("all");
  const [townshipFilter, setTownshipFilter] = useState<string>("All");
  const [sortOption, setSortOption] = useState<CustomerSortOption>("spent_desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Server-side customer pagination
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<CustomerDossier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [allTownships, setAllTownships] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { sortKey, sortDir } = useMemo(() => {
    switch (sortOption) {
      case "newest":
        return { sortKey: "joinedAt" as const, sortDir: "desc" as const };
      case "orders_desc":
        return { sortKey: "orderCount" as const, sortDir: "desc" as const };
      case "recent_activity":
        return { sortKey: "lastOrder" as const, sortDir: "desc" as const };
      case "name_asc":
        return { sortKey: "name" as const, sortDir: "asc" as const };
      case "spent_asc":
        return { sortKey: "totalSpent" as const, sortDir: "asc" as const };
      case "spent_desc":
      default:
        return { sortKey: "totalSpent" as const, sortDir: "desc" as const };
    }
  }, [sortOption]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortKey,
        sortDir,
      });
      if (search.trim()) sp.set("q", search.trim());
      if (tierFilter !== "all") sp.set("tier", tierFilter);
      if (townshipFilter !== "All") sp.set("township", townshipFilter);

      const res = await fetch(`/api/customers?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (Array.isArray(data.allTownships) && data.allTownships.length > 0) {
          setAllTownships(data.allTownships);
        }
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, tierFilter, townshipFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (tierFilter !== "all") count++;
    if (townshipFilter !== "All") count++;
    if (sortOption !== "spent_desc") count++;
    return count;
  }, [search, tierFilter, townshipFilter, sortOption]);

  const handleResetFilters = () => {
    setSearch("");
    setTierFilter("all");
    setTownshipFilter("All");
    setSortOption("spent_desc");
    setPage(1);
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            {t.customersPageTitle}
          </h2>
          <p className="text-sm text-[#806B73]">
            {t.customersPageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <span className="rounded-full border border-[#F0E1E6] bg-white px-3.5 py-1 text-xs font-semibold text-[#33272C] shadow-xs">
            {total} customers
          </span>
        </div>
      </div>

      {/* Modern Perplexity Filter Console */}
      <Card className="rounded-[24px] border border-[#EEDFE5] bg-white shadow-xs overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          {/* Top row: Search, Township, Sort, and Reset */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search customers by name, phone, or email..."
                className="pl-10 h-10 rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/60 focus:bg-white text-sm"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Township Dropdown */}
              <div className="w-[160px]">
                <Select
                  value={townshipFilter}
                  onValueChange={(val) => {
                    setTownshipFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <MapPin className="h-3.5 w-3.5 text-[#B73D67] mr-1 shrink-0" />
                    <SelectValue placeholder="All Townships" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Townships</SelectItem>
                    {allTownships.map((township) => (
                      <SelectItem key={township} value={township}>
                        {township}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Selector */}
              <div className="w-[200px]">
                <Select
                  value={sortOption}
                  onValueChange={(val) => {
                    setSortOption(val as CustomerSortOption);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#B73D67] mr-1 shrink-0" />
                    <SelectValue placeholder="Sort customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spent_desc">Most Spending (High LTV)</SelectItem>
                    <SelectItem value="newest">Newest Customers</SelectItem>
                    <SelectItem value="orders_desc">Most Orders</SelectItem>
                    <SelectItem value="recent_activity">Recent Activity</SelectItem>
                    <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                    <SelectItem value="spent_asc">Lowest Spend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear filters trigger */}
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

          {/* Bottom row: Business Segment Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-semibold text-[#806B73] uppercase tracking-wider mr-1">
              Segments:
            </span>
            <button
              type="button"
              onClick={() => {
                setTierFilter("all");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                tierFilter === "all"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              All Shoppers
            </button>
            <button
              type="button"
              onClick={() => {
                setTierFilter("vip");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1",
                tierFilter === "vip"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              <Sparkles className="h-3 w-3" />
              VIP Spenders (&gt;150k MMK)
            </button>
            <button
              type="button"
              onClick={() => {
                setTierFilter("repeat");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1",
                tierFilter === "repeat"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              <Users className="h-3 w-3" />
              Repeat Buyers (2+ Orders)
            </button>
            <button
              type="button"
              onClick={() => {
                setTierFilter("new");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                tierFilter === "new"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              New Shoppers
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Data Table */}
      <Card className="rounded-[24px] border border-[#EEDFE5] bg-white shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#EEDFE5] bg-[#FAF7F8]/80 hover:bg-[#FAF7F8]/80">
                <TableHead className="font-semibold text-[#33272C]">Customer</TableHead>
                <TableHead className="font-semibold text-[#33272C]">Phone Number</TableHead>
                <TableHead className="font-semibold text-[#33272C]">Total Orders</TableHead>
                <TableHead className="font-semibold text-[#33272C]">Total Spent</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold text-[#33272C]">Last Order</TableHead>
                <TableHead className="text-right font-semibold text-[#33272C]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn("transition-opacity duration-200", isLoading && "opacity-40 pointer-events-none")}>
              {isLoading && customers.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-[#F0E1E6]/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                        <div className="space-y-1.5 min-w-0">
                          <Skeleton className="h-4 w-32 rounded-md" />
                          <Skeleton className="h-3 w-20 rounded-md" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3.5 w-24 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-3.5 w-20 rounded-md" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-16 rounded-lg ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-[#806B73]">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F8] text-[#B73D67] mb-2 border border-[#EEDFE5]">
                      <Users className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#33272C]">
                      No customers match your criteria
                    </p>
                    <p className="text-xs text-[#806B73] mt-0.5">
                      Try clearing filters or searching with a different phone or name.
                    </p>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-3.5 h-8 text-xs rounded-xl border-[#EEDFE5]"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id} className="border-b border-[#F0E1E6]/40 hover:bg-[#FAF7F8]/60 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCEEF2] text-xs font-semibold text-[#B73D67] border border-[#F1D3DF]">
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
                    <TableCell className="text-xs font-mono text-[#33272C]">
                      {c.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="rounded-full bg-[#FAF7F8] text-[#514149] border-[#EEDFE5]">
                        {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap text-[#33272C]">
                      {formatMMK(c.totalSpent)}
                      {c.totalSpent >= 150000 && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FCEEF2] text-[#B73D67]">
                          VIP
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                      {c.lastOrderDate ? formatDate(c.lastOrderDate) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomer(c)}
                        className="h-8 text-xs font-medium text-[#B73D67] hover:bg-[#FCEEF2] hover:text-[#982F53] rounded-lg"
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

          {/* Customer Pagination */}
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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FCEEF2] text-xl font-bold text-[#B73D67] border border-[#F1D3DF]">
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
                      <Phone className="h-3.5 w-3.5 text-[#B73D67]" />
                      <span className="font-mono">{activeDetails.phone}</span>
                    </p>
                    {activeDetails.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-[#B73D67]" />
                        <span className="truncate">{activeDetails.email}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#B73D67]" />
                      <span>
                        Customer since {formatDate(activeDetails.joinedAt)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#F0E1E6] bg-[#FAF7F8] p-3">
                  <p className="text-[11px] text-[#806B73]">Total Spent</p>
                  <p className="text-sm font-bold text-[#33272C] mt-0.5">
                    {formatMMK(activeDetails.totalSpent)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0E1E6] bg-[#FAF7F8] p-3">
                  <p className="text-[11px] text-[#806B73]">Total Orders</p>
                  <p className="text-sm font-bold text-[#33272C] mt-0.5">
                    {activeDetails.totalOrders}
                  </p>
                </div>
              </div>

              {/* Delivery Addresses */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#806B73] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#B73D67]" /> Delivery
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
                      <p className="text-[11px] text-[#B73D67] flex items-center gap-1 pt-0.5 font-medium">
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
                  <ShoppingBag className="h-3.5 w-3.5 text-[#B73D67]" /> Order
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
                          <span className="text-xs font-semibold text-[#B73D67]">
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

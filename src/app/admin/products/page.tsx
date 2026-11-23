"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  ArrowUpDown,
  Pencil,
  Archive,
  Trash2,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { Category, Product, ProductStatus } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductStatusBadge } from "@/components/ui/status-badge";
import { PaginationControl } from "@/components/ui/pagination";
import { formatMMK } from "@/lib/utils";

type SortKey = "name" | "price" | "stock";

export default function ProductsPage() {
  const {
    categories,
    updateProduct,
    deleteProduct,
    globalSearch,
    setGlobalSearch,
  } = useAdminStore();
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [statusFilter, setStatusFilter] = useState<"All" | ProductStatus>("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Server-side paginated state (max 10 items)
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Pick up the header global search once, then clear it.
  useEffect(() => {
    if (globalSearch.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from shared header search
      setSearch(globalSearch.trim());
      setPage(1);
      setGlobalSearch("");
    }
  }, [globalSearch, setGlobalSearch]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (categoryFilter !== "all") sp.set("category", categoryFilter);
      if (statusFilter !== "All") sp.set("status", statusFilter);
      if (stockFilter !== "all") sp.set("stock", stockFilter);
      if (search.trim()) sp.set("q", search.trim());
      if (sortKey) sp.set("sortKey", sortKey);
      if (sortDir) sp.set("sortDir", sortDir);

      const res = await fetch(`/api/products?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, statusFilter, stockFilter, search, sortKey, sortDir]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on query params change
    fetchProducts();
  }, [fetchProducts]);

  const sortedCategories = useMemo(
    () => [...(categories || [])].sort((a: Category, b: Category) => a.name.localeCompare(b.name)),
    [categories]
  );

  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId || c.slug === catId);
    return found?.name ?? "Uncategorized";
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleStatusToggle = async (product: Product) => {
    const nextStatus = product.status === "Active" ? "Archived" : "Active";
    updateProduct(product.id, { status: nextStatus });
    toast.success(
      `Product marked as ${nextStatus === "Active" ? "active" : "archived"}`
    );
    // Refresh page
    fetchProducts();
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
      fetchProducts();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            {t.productsPageTitle}
          </h2>
          <p className="text-sm text-[#806B73]">
            {t.productsPageSubtitle}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" /> {t.addProductBtn}
          </Link>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, SKU, or brand..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {sortedCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={stockFilter}
              onValueChange={(v) => {
                setStockFilter(v as "all" | "in" | "low" | "out");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "All" | ProductStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 font-semibold hover:text-[#33272C] cursor-pointer"
                  >
                    Product
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("price")}
                    className="flex items-center gap-1 font-semibold hover:text-[#33272C] cursor-pointer"
                  >
                    Price
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("stock")}
                    className="flex items-center gap-1 font-semibold hover:text-[#33272C] cursor-pointer"
                  >
                    Stock
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#806B73]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#D96B91]" />
                      <span className="text-xs">Fetching products...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#806B73]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm font-medium text-[#33272C]">
                        No products found
                      </p>
                      <p className="text-xs">
                        Try adjusting your filters or search keywords.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
                  const isOut = p.stock === 0;

                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Image
                            src={p.images[0] || "/placeholder.png"}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg border border-[#F0E1E6] shrink-0 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-[#33272C] truncate max-w-[220px]">
                              {p.name}
                            </p>
                            <p className="text-xs text-[#806B73] font-mono">
                              {p.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        <span className="inline-flex items-center rounded-full bg-rose-50 border border-[#F2D4DE] px-2.5 py-0.5 text-xs font-medium text-[#D96B91]">
                          {getCategoryName(p.categoryId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          {p.salePrice ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-semibold text-[#B73D67]">
                                {formatMMK(p.salePrice)}
                              </span>
                              <span className="text-xs line-through text-[#806B73]">
                                {formatMMK(p.regularPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium text-[#33272C]">
                              {formatMMK(p.regularPrice)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isOut
                                ? "text-rose-600 font-semibold"
                                : isLow
                                ? "text-amber-600 font-medium"
                                : "text-[#33272C]"
                            }
                          >
                            {p.stock}
                          </span>
                          {isOut && (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                              Out
                            </Badge>
                          )}
                          {isLow && (
                            <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <ProductStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/${p.id}`}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit Product
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusToggle(p)}>
                              <Archive className="h-4 w-4 mr-2" />
                              {p.status === "Active" ? "Archive" : "Unarchive"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Control (Max 10 per page, server-fetched) */}
          <PaginationControl
            page={page}
            totalPages={totalPages}
            totalItems={total}
            limit={10}
            isLoading={isLoading}
            onPageChange={setPage}
            itemLabel="products"
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#33272C]">
                {deleteTarget?.name}
              </span>
              ? This action removes it from your local catalog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

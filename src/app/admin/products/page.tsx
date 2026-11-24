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
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Tag,
  Package,
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatMMK, cn } from "@/lib/utils";

type SortKey = "name" | "price" | "stock" | "createdAt" | "soldCount";
type ProductSortOption =
  | "name_asc"
  | "newest"
  | "bestseller"
  | "price_desc"
  | "price_asc"
  | "stock_asc";
type MerchandisingFilter = "all" | "new" | "bestseller" | "promo" | "lowstock";

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
  const [merchandisingFilter, setMerchandisingFilter] = useState<MerchandisingFilter>("all");
  const [sortOption, setSortOption] = useState<ProductSortOption>("newest");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Server-side paginated state
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Pick up the header global search once, then clear it.
  useEffect(() => {
    if (globalSearch.trim()) {
      setSearch(globalSearch.trim());
      setPage(1);
      setGlobalSearch("");
    }
  }, [globalSearch, setGlobalSearch]);

  const { sortKey, sortDir } = useMemo(() => {
    switch (sortOption) {
      case "newest":
        return { sortKey: "createdAt" as const, sortDir: "desc" as const };
      case "bestseller":
        return { sortKey: "soldCount" as const, sortDir: "desc" as const };
      case "price_desc":
        return { sortKey: "price" as const, sortDir: "desc" as const };
      case "price_asc":
        return { sortKey: "price" as const, sortDir: "asc" as const };
      case "stock_asc":
        return { sortKey: "stock" as const, sortDir: "asc" as const };
      case "name_asc":
      default:
        return { sortKey: "name" as const, sortDir: "asc" as const };
    }
  }, [sortOption]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortKey,
        sortDir,
      });
      if (categoryFilter !== "all") sp.set("category", categoryFilter);
      if (statusFilter !== "All") sp.set("status", statusFilter);
      if (stockFilter !== "all") sp.set("stock", stockFilter);
      if (merchandisingFilter !== "all") sp.set("merchandising", merchandisingFilter);
      if (search.trim()) sp.set("q", search.trim());

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
  }, [page, categoryFilter, statusFilter, stockFilter, merchandisingFilter, search, sortKey, sortDir]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (categoryFilter !== "all") count++;
    if (stockFilter !== "all") count++;
    if (statusFilter !== "All") count++;
    if (merchandisingFilter !== "all") count++;
    if (sortOption !== "newest") count++;
    return count;
  }, [search, categoryFilter, stockFilter, statusFilter, merchandisingFilter, sortOption]);

  const handleResetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStockFilter("all");
    setStatusFilter("All");
    setMerchandisingFilter("all");
    setSortOption("newest");
    setPage(1);
  };

  const sortedCategories = useMemo(
    () => [...(categories || [])].sort((a: Category, b: Category) => a.name.localeCompare(b.name)),
    [categories]
  );

  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId || c.slug === catId);
    return found?.name ?? "Uncategorized";
  };

  const handleStatusToggle = async (product: Product) => {
    const nextStatus = product.status === "Active" ? "Archived" : "Active";
    try {
      await updateProduct(product.id, { status: nextStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
      );
      toast.success(`Product set to ${nextStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            {t.productsPageTitle}
          </h2>
          <p className="text-sm text-[#806B73]">
            {t.productsPageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start">
          <span className="rounded-full border border-[#F0E1E6] bg-white px-3.5 py-1 text-xs font-semibold text-[#33272C] shadow-xs">
            {total} {t.productsCountSuffix}
          </span>
          <Button asChild className="rounded-xl bg-[#B73D67] hover:bg-[#982F53] text-white shadow-xs">
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4 mr-1.5" />
              {t.addProductBtn}
            </Link>
          </Button>
        </div>
      </div>

      {/* Modern Perplexity Filter Console */}
      <Card className="rounded-[24px] border border-[#EEDFE5] bg-white shadow-xs overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          {/* Top row: Search, Category, Stock, Status, Sort, Reset */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search products by name, SKU, or brand..."
                className="pl-10 h-10 rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/60 focus:bg-white text-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category */}
              <div className="w-[150px]">
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => {
                    setCategoryFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
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
              </div>

              {/* Stock */}
              <div className="w-[130px]">
                <Select
                  value={stockFilter}
                  onValueChange={(v) => {
                    setStockFilter(v as "all" | "in" | "low" | "out");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="w-[125px]">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as "All" | ProductStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Business Sort Selector */}
              <div className="w-[190px]">
                <Select
                  value={sortOption}
                  onValueChange={(v) => {
                    setSortOption(v as ProductSortOption);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#EEDFE5] bg-white text-xs font-medium">
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#B73D67] mr-1 shrink-0" />
                    <SelectValue placeholder="Sort products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest Arrivals (Recent)</SelectItem>
                    <SelectItem value="bestseller">Best Sellers (Top Moving)</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="stock_asc">Lowest Stock (Restock)</SelectItem>
                    <SelectItem value="name_asc">Name (A–Z)</SelectItem>
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

          {/* Bottom row: Merchandising Segment Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-semibold text-[#806B73] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Package className="h-3 w-3" /> Merchandising:
            </span>
            <button
              type="button"
              onClick={() => {
                setMerchandisingFilter("all");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                merchandisingFilter === "all"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              All Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                setMerchandisingFilter("new");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1",
                merchandisingFilter === "new"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              <Sparkles className="h-3 w-3" />
              New Arrivals
            </button>
            <button
              type="button"
              onClick={() => {
                setMerchandisingFilter("bestseller");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1",
                merchandisingFilter === "bestseller"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              <TrendingUp className="h-3 w-3" />
              Best Sellers
            </button>
            <button
              type="button"
              onClick={() => {
                setMerchandisingFilter("promo");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1",
                merchandisingFilter === "promo"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              <Tag className="h-3 w-3" />
              On Promotion
            </button>
            <button
              type="button"
              onClick={() => {
                setMerchandisingFilter("lowstock");
                setPage(1);
              }}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1",
                merchandisingFilter === "lowstock"
                  ? "bg-[#B73D67] text-white shadow-xs font-semibold"
                  : "bg-[#FAF7F8] border border-[#EEDFE5] text-[#514149] hover:bg-[#FCEEF2] hover:text-[#B73D67]"
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              Low Stock Alert
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="rounded-[28px] border-[#EEDFE5] overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#FAF7F8]/80">
              <TableRow>
                <TableHead className="font-semibold text-[#38262E]">Product</TableHead>
                <TableHead className="hidden md:table-cell font-semibold text-[#38262E]">Category</TableHead>
                <TableHead className="font-semibold text-[#38262E]">Price</TableHead>
                <TableHead className="font-semibold text-[#38262E]">Stock</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold text-[#38262E]">Status</TableHead>
                <TableHead className="text-right font-semibold text-[#38262E] pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn("transition-opacity duration-200", isLoading && "opacity-40 pointer-events-none")}>
              {isLoading && products.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-[#F0E1E6]/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                        <div className="space-y-1.5 min-w-0">
                          <Skeleton className="h-4 w-36 rounded-md" />
                          <Skeleton className="h-3 w-20 rounded-md" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24 rounded-md" />
                        <Skeleton className="h-3 w-16 rounded-md" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-[#806B73]">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F8] text-[#B73D67] mb-2 border border-[#EEDFE5]">
                      <Package className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#33272C]">
                      No products match your criteria
                    </p>
                    <p className="text-xs text-[#806B73] mt-0.5">
                      Try clearing filters or searching with a different SKU or keyword.
                    </p>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-3.5 h-8 text-xs rounded-xl border-[#EEDFE5]"
                      >
                        Reset Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
                  const isOut = p.stock === 0;

                  return (
                    <TableRow key={p.id} className="border-b border-[#F0E1E6]/40 hover:bg-[#FAF7F8]/60 transition-colors">
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
                            <p className="font-semibold text-[#33272C] truncate max-w-[220px]">
                              {p.name}
                            </p>
                            <p className="text-xs text-[#806B73] font-mono">
                              {p.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        <span className="inline-flex items-center rounded-full bg-[#FCEEF2] border border-[#F1D3DF] px-2.5 py-0.5 text-xs font-semibold text-[#B73D67]">
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
                            <span className="font-semibold text-[#33272C]">
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
                                : "text-[#33272C] font-medium"
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
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#806B73] hover:text-[#B73D67]">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/${p.id}`}>
                                <Pencil className="h-4 w-4 mr-2 text-[#B73D67]" /> Edit Product
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusToggle(p)}>
                              <Archive className="h-4 w-4 mr-2" />
                              {p.status === "Active" ? "Archive" : "Unarchive"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-600"
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

          {/* Pagination Control */}
          <PaginationControl
            page={page}
            totalPages={totalPages}
            totalItems={total}
            limit={10}
            isLoading={isLoading}
            onPageChange={setPage}
            itemLabel="products"
            className="border-t border-[#EEDFE5] px-4 py-3"
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="rounded-[24px]">
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
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDeleteConfirm}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ArrowUpDown,
  Pencil,
  Archive,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { Product, ProductStatus } from "@/types/admin";
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
import { formatMMK } from "@/lib/utils";

type SortKey = "name" | "price" | "stock";

export default function ProductsPage() {
  const {
    products,
    categories,
    updateProduct,
    deleteProduct,
    globalSearch,
    setGlobalSearch,
  } = useAdminStore();

  const [search, setSearch] = useState("");

  // Pick up the header global search once, then clear it.
  React.useEffect(() => {
    if (globalSearch.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the shared search store
      setSearch(globalSearch.trim());
      setGlobalSearch("");
    }
  }, [globalSearch, setGlobalSearch]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [statusFilter, setStatusFilter] = useState<"All" | ProductStatus>("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const pageSize = 7;

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name ?? "Uncategorized";

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
        if (statusFilter !== "All" && p.status !== statusFilter) return false;
        if (stockFilter === "out" && p.stock > 0) return false;
        if (
          stockFilter === "low" &&
          (p.stock === 0 || p.stock > p.lowStockThreshold)
        )
          return false;
        if (stockFilter === "in" && p.stock <= p.lowStockThreshold) return false;
        if (q) {
          const match =
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") {
          cmp = a.name.localeCompare(b.name);
        } else if (sortKey === "price") {
          cmp = (a.salePrice ?? a.regularPrice) - (b.salePrice ?? b.regularPrice);
        } else {
          cmp = a.stock - b.stock;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [products, search, categoryFilter, stockFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            Products Catalog
          </h2>
          <p className="text-sm text-[#806B73]">
            Manage contact lenses, skincare, cosmetics, lashes, and accessories.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
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
                placeholder="Search by product name, SKU, or brand..."
                className="pl-9"
              />
            </div>

            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
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
              <SelectTrigger>
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
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
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card>
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-[#33272C]">
                No products found
              </p>
              <p className="text-xs text-[#806B73] mt-1">
                Adjust your search or add a new beauty product.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("name")}
                      className="inline-flex items-center gap-1 hover:text-[#33272C] cursor-pointer"
                    >
                      Product <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">SKU</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("price")}
                      className="inline-flex items-center gap-1 hover:text-[#33272C] cursor-pointer"
                    >
                      Price <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("stock")}
                      className="inline-flex items-center gap-1 hover:text-[#33272C] cursor-pointer"
                    >
                      Stock <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-11 w-11 rounded-xl border border-[#F0E1E6] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="font-semibold text-[#33272C] hover:text-[#D96B91] truncate block max-w-[230px]"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-[#806B73]">
                            {product.brand}
                            {product.variants.length > 0 &&
                              ` · ${product.variants.length} variants`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-[#806B73]">
                      {product.sku}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                      {getCategoryName(product.categoryId)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {product.salePrice ? (
                        <div>
                          <span className="font-semibold text-[#D96B91]">
                            {formatMMK(product.salePrice)}
                          </span>
                          <span className="block text-[11px] text-[#806B73] line-through">
                            {formatMMK(product.regularPrice)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold">
                          {formatMMK(product.regularPrice)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.stock === 0 ? (
                        <Badge variant="destructive">Out of stock</Badge>
                      ) : product.stock <= product.lowStockThreshold ? (
                        <Badge variant="warning">{product.stock} low</Badge>
                      ) : (
                        <span className="font-medium text-[#33272C]">
                          {product.stock}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${product.id}`}>
                              <Pencil className="h-4 w-4" /> Edit Product
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const nextStatus =
                                product.status === "Archived"
                                  ? "Active"
                                  : "Archived";
                              updateProduct(product.id, { status: nextStatus });
                              toast.success(
                                `${product.name} marked as ${nextStatus}`
                              );
                            }}
                          >
                            <Archive className="h-4 w-4" />
                            {product.status === "Archived"
                              ? "Unarchive"
                              : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(product)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#F0E1E6] px-4 py-3">
              <p className="text-xs text-[#806B73]">
                Showing {paginated.length} of {filtered.length} products (Page{" "}
                {page} of {totalPages})
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
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteProduct(deleteTarget.id);
                  toast.success(`Deleted "${deleteTarget.name}"`);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

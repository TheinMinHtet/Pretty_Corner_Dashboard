"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  Minus,
  History,
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { Product, StockAdjustment, InventoryStats } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PaginationControl } from "@/components/ui/pagination";
import { formatDateTime, cn } from "@/lib/utils";

export default function InventoryPage() {
  const { categories, adjustStock } = useAdminStore();
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");

  // Server-side Stock Levels state (strictly max 10 per page)
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStats>({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  // Server-side Stock History state (strictly max 10 per page)
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItems, setHistoryItems] = useState<StockAdjustment[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Trigger to refetch after mutations
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Adjustment Dialog state
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [targetStock, setTargetStock] = useState<number>(0);
  const [targetStockInput, setTargetStockInput] = useState<string>("0");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    let ignore = false;
    const loadStock = async () => {
      try {
        const sp = new URLSearchParams({
          page: String(page),
          limit: "10",
        });
        if (categoryFilter !== "all") sp.set("category", categoryFilter);
        if (stockFilter !== "all") sp.set("stock", stockFilter);
        if (search.trim()) sp.set("q", search.trim());

        const res = await fetch(`/api/inventory?${sp.toString()}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load inventory:", err);
          toast.error("Failed to load inventory");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadStock();
    return () => {
      ignore = true;
    };
  }, [page, categoryFilter, stockFilter, search, refreshTrigger]);

  useEffect(() => {
    let ignore = false;
    const loadHistory = async () => {
      try {
        const sp = new URLSearchParams({
          page: String(historyPage),
          limit: "10",
        });
        const res = await fetch(`/api/inventory/history?${sp.toString()}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          setHistoryItems(data.history || []);
          setHistoryTotal(data.total || 0);
          setHistoryTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load history:", err);
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();
    return () => {
      ignore = true;
    };
  }, [historyPage, refreshTrigger]);

  const currentStock = useMemo(() => {
    return adjustTarget?.stock ?? 0;
  }, [adjustTarget]);

  const stockDelta = targetStock - currentStock;

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const getCategoryName = (id: string) => {
    const found = categories.find((c) => c.id === id || c.slug === id);
    return found?.name ?? "Uncategorized";
  };

  const openAdjust = (
    product: Product,
    defaultType: "increase" | "decrease" = "increase"
  ) => {
    setAdjustTarget(product);
    const base = product.stock;
    const initialTarget = defaultType === "decrease" && base > 0 ? base - 1 : base;
    setTargetStock(initialTarget);
    setTargetStockInput(String(initialTarget));
    setAdjustReason("");
  };

  const handleStepChange = (step: number) => {
    const next = Math.max(0, targetStock + step);
    setTargetStock(next);
    setTargetStockInput(String(next));
  };

  const handleDirectInputChange = (val: string) => {
    setTargetStockInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setTargetStock(Math.max(0, num));
    }
  };

  const handleDirectInputBlur = () => {
    if (targetStockInput === "" || isNaN(parseInt(targetStockInput, 10))) {
      setTargetStockInput(String(targetStock));
    } else {
      setTargetStockInput(String(targetStock));
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    const delta = stockDelta;
    if (delta === 0) {
      toast.info("No stock changes were made");
      setAdjustTarget(null);
      return;
    }

    const type: "increase" | "decrease" = delta > 0 ? "increase" : "decrease";
    const qty = Math.abs(delta);

    adjustStock(
      adjustTarget.id,
      type,
      qty,
      adjustReason.trim() ||
        (type === "increase" ? "Restock shipment" : "Manual stock deduction")
    );
    toast.success(
      `Stock ${type === "increase" ? "increased" : "decreased"} by ${qty} for ${adjustTarget.name} (New: ${targetStock})`
    );
    setAdjustTarget(null);

    // Refresh current paginated views via trigger and state
    setIsLoading(true);
    setHistoryLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleQuickStep = (product: Product, delta: number) => {
    if (delta < 0 && product.stock <= 0) return;
    const type: "increase" | "decrease" = delta > 0 ? "increase" : "decrease";
    const qty = 1;
    const newStock = Math.max(0, product.stock + delta);

    adjustStock(
      product.id,
      type,
      qty,
      delta > 0
        ? "Quick shelf count increment (+1)"
        : "Quick shelf count decrement (-1)"
    );

    // Optimistically update the product in local state
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p))
    );

    toast.success(
      `${product.name} stock ${delta > 0 ? "+1" : "-1"} (${newStock} units)`
    );

    // Trigger sync with server repository
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#38262E] tracking-tight">
          {t.inventoryPageTitle}
        </h2>
        <p className="text-sm text-[#7A6870] mt-1">
          {t.inventoryPageSubtitle}
        </p>
      </div>

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[28px] border border-[#EEDFE5] bg-white p-5 flex items-center justify-between transition-all hover:border-[#D96B91]/40 hover:shadow-xs">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6870]">Total Products</p>
            <p className="text-3xl font-black text-[#38262E] mt-1 tabular-nums">
              {stats.total}
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#FCEEF2] flex items-center justify-center shrink-0">
            <Boxes className="h-5 w-5 text-[#B73D67]" />
          </div>
        </div>

        <div className="rounded-[28px] border border-[#EEDFE5] bg-white p-5 flex items-center justify-between transition-all hover:border-emerald-200 hover:shadow-xs">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6870]">In-Stock</p>
            <p className="text-3xl font-black text-emerald-600 mt-1 tabular-nums">
              {stats.inStock}
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        <div className="rounded-[28px] border border-[#EEDFE5] bg-white p-5 flex items-center justify-between transition-all hover:border-amber-200 hover:shadow-xs">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6870]">Low-Stock Alerts</p>
            <p className="text-3xl font-black text-amber-600 mt-1 tabular-nums">
              {stats.lowStock}
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
        </div>

        <div className="rounded-[28px] border border-[#EEDFE5] bg-white p-5 flex items-center justify-between transition-all hover:border-rose-200 hover:shadow-xs">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6870]">Out-of-Stock</p>
            <p className="text-3xl font-black text-rose-600 mt-1 tabular-nums">
              {stats.outOfStock}
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
        </div>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="bg-[#FAF7F8] border border-[#EEDFE5] p-1.5 rounded-2xl h-auto">
          <TabsTrigger
            value="stock"
            className="rounded-xl px-4 py-2 font-semibold text-xs text-[#7A6870] data-[state=active]:bg-white data-[state=active]:text-[#38262E] data-[state=active]:shadow-xs transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-[#B73D67]" /> {t.stockLevelsTab}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-xl px-4 py-2 font-semibold text-xs text-[#7A6870] data-[state=active]:bg-white data-[state=active]:text-[#38262E] data-[state=active]:shadow-xs transition-all cursor-pointer"
          >
            <History className="h-3.5 w-3.5 mr-1.5 text-[#B73D67]" /> {t.stockHistoryTab} ({historyTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-0">
          <div className="rounded-[32px] border border-[#EEDFE5] bg-white shadow-xs overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-4 sm:p-5 border-b border-[#F0E1E6] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-[#FAF7F8]/50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A6870]" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setIsLoading(true);
                    setPage(1);
                  }}
                  placeholder="Search product or SKU..."
                  className="pl-10 pr-14 h-10 bg-white rounded-xl border-[#EEDFE5] text-sm text-[#38262E] placeholder:text-[#7A6870]/70 focus:border-[#B73D67] transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setIsLoading(true);
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#7A6870] hover:text-[#38262E] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => {
                    setCategoryFilter(v);
                    setIsLoading(true);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px] h-10 bg-white rounded-xl border-[#EEDFE5] text-xs font-medium text-[#38262E]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#EEDFE5]">
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
                    setIsLoading(true);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[170px] h-10 bg-white rounded-xl border-[#EEDFE5] text-xs font-medium text-[#38262E]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#EEDFE5]">
                    <SelectItem value="all">All Stock Statuses</SelectItem>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden xl:flex items-center px-3.5 py-2 rounded-xl bg-white border border-[#EEDFE5] text-xs text-[#7A6870]">
                  <span className="font-bold text-[#38262E] mr-1">{total}</span> items found
                </div>
              </div>
            </div>

            {/* Table with Defined Proportions */}
            <div className="relative w-full overflow-x-auto">
              <Table className="w-full text-left border-collapse table-fixed min-w-[760px]">
                <TableHeader>
                  <TableRow className="border-b border-[#F0E1E6] bg-[#FAF7F8]/80 hover:bg-[#FAF7F8]/80">
                    <TableHead className="w-[36%] pl-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Product & SKU
                    </TableHead>
                    <TableHead className="w-[18%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Category
                    </TableHead>
                    <TableHead className="w-[18%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Stock Level
                    </TableHead>
                    <TableHead className="w-[14%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Status
                    </TableHead>
                    <TableHead className="w-[14%] pr-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-[#7A6870]">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <Loader2 className="h-6 w-6 animate-spin text-[#B73D67]" />
                          <span className="text-xs font-medium">Fetching stock levels...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-[#7A6870]">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Boxes className="h-8 w-8 text-[#EEDFE5] stroke-[1.5]" />
                          <p className="text-sm font-semibold text-[#38262E]">No inventory records found</p>
                          <p className="text-xs text-[#7A6870]">Try adjusting your search query or status filter.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => {
                      const isOut = p.stock === 0;
                      const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;

                      return (
                        <TableRow
                          key={p.id}
                          className="border-b border-[#F0E1E6]/80 hover:bg-[#FAF7F8]/80 transition-colors"
                        >
                          <TableCell className="py-4 pl-6 pr-4 align-middle">
                            <div className="flex items-center gap-3.5">
                              <div className="relative h-11 w-11 rounded-xl border border-[#EEDFE5] bg-[#FAF7F8] overflow-hidden shrink-0">
                                <Image
                                  src={p.images[0] || "/placeholder.png"}
                                  alt={p.name}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="font-semibold text-sm text-[#38262E] leading-snug line-clamp-1"
                                  title={p.name}
                                >
                                  {p.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[11px] text-[#7A6870] tracking-wide">
                                    {p.sku}
                                  </span>
                                  {p.brand && (
                                    <span className="text-[10px] text-[#7A6870]/70 font-medium">
                                      · {p.brand}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <span className="inline-flex items-center rounded-full bg-[#FAF7F8] border border-[#EEDFE5] px-3 py-1 text-xs font-medium text-[#7A6870] truncate max-w-full">
                              {getCategoryName(p.categoryId)}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-baseline gap-1 min-w-[54px]">
                                  <span className="text-base font-black text-[#38262E] tabular-nums">
                                    {p.stock}
                                  </span>
                                  <span className="text-xs text-[#7A6870] font-medium">units</span>
                                </div>
                                <div className="inline-flex items-center rounded-lg border border-[#EEDFE5] bg-white p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    disabled={p.stock <= 0}
                                    onClick={() => handleQuickStep(p, -1)}
                                    aria-label={`Decrease ${p.name} stock by 1`}
                                    title="Decrease stock by 1"
                                    className="h-6 w-6 flex items-center justify-center rounded-md text-[#7A6870] hover:text-[#B73D67] hover:bg-[#FCEEF2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <div className="h-3 w-px bg-[#EEDFE5]" />
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStep(p, 1)}
                                    aria-label={`Increase ${p.name} stock by 1`}
                                    title="Increase stock by 1"
                                    className="h-6 w-6 flex items-center justify-center rounded-md text-[#7A6870] hover:text-[#B73D67] hover:bg-[#FCEEF2] transition-colors cursor-pointer"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <span className="text-[11px] text-[#7A6870] mt-1 font-normal">
                                Threshold: <span className="font-medium text-[#38262E]">{p.lowStockThreshold}</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                In Stock
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 pl-4 pr-6 text-right align-middle">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8.5 px-3.5 rounded-xl border-[#EEDFE5] text-xs font-medium text-[#38262E] hover:bg-[#FCEEF2] hover:text-[#B73D67] hover:border-[#B73D67] transition-all cursor-pointer"
                              onClick={() =>
                                openAdjust(p, isOut || isLow ? "increase" : "decrease")
                              }
                            >
                              Adjust Stock
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="border-t border-[#F0E1E6] bg-[#FAF7F8]/40 p-3">
              <PaginationControl
                page={page}
                totalPages={totalPages}
                totalItems={total}
                limit={10}
                isLoading={isLoading}
                onPageChange={(p) => {
                  setPage(p);
                  setIsLoading(true);
                }}
                itemLabel="inventory items"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className="rounded-[32px] border border-[#EEDFE5] bg-white shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#F0E1E6] flex items-center justify-between bg-[#FAF7F8]/60">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#38262E]">Audit Trail</h3>
                <p className="text-xs text-[#7A6870]">
                  Chronological log of manual adjustments, restocks, and deductions.
                </p>
              </div>
              <div className="flex items-center px-3.5 py-2 rounded-xl bg-white border border-[#EEDFE5] text-xs text-[#7A6870]">
                <span className="font-bold text-[#38262E] mr-1">{historyTotal}</span> logs recorded
              </div>
            </div>

            <div className="relative w-full overflow-x-auto">
              <Table className="w-full text-left border-collapse table-fixed min-w-[760px]">
                <TableHeader>
                  <TableRow className="border-b border-[#F0E1E6] bg-[#FAF7F8]/80 hover:bg-[#FAF7F8]/80">
                    <TableHead className="w-[32%] pl-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Product & SKU
                    </TableHead>
                    <TableHead className="w-[14%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Change
                    </TableHead>
                    <TableHead className="w-[18%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Stock Transition
                    </TableHead>
                    <TableHead className="w-[18%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Reason
                    </TableHead>
                    <TableHead className="w-[18%] pr-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Performed By & Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading && historyItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-[#7A6870]">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <Loader2 className="h-6 w-6 animate-spin text-[#B73D67]" />
                          <span className="text-xs font-medium">Fetching history logs...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : historyItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-[#7A6870]">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <History className="h-8 w-8 text-[#EEDFE5] stroke-[1.5]" />
                          <p className="text-sm font-semibold text-[#38262E]">No stock history logs yet</p>
                          <p className="text-xs text-[#7A6870]">Adjustment logs will appear here when inventory is updated.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyItems.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className="border-b border-[#F0E1E6]/80 hover:bg-[#FAF7F8]/80 transition-colors"
                      >
                        <TableCell className="py-4 pl-6 pr-4 align-middle">
                          <p className="font-semibold text-sm text-[#38262E] leading-snug line-clamp-1">
                            {entry.productName}
                          </p>
                          <p className="font-mono text-[11px] text-[#7A6870] tracking-wide mt-0.5">
                            {entry.sku}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                              entry.type === "increase"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            )}
                          >
                            {entry.type === "increase" ? "+" : "-"}
                            {entry.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-[#7A6870]">
                            <span className="font-medium text-[#7A6870] tabular-nums">{entry.previousStock}</span>
                            <ArrowRight className="h-3 w-3 text-[#7A6870]/70" />
                            <span className="font-bold text-[#38262E] tabular-nums">{entry.newStock} units</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <span className="text-xs text-[#38262E] font-medium line-clamp-2">
                            {entry.reason}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 pl-4 pr-6 text-right align-middle">
                          <p className="text-xs font-semibold text-[#38262E]">
                            {entry.performedBy}
                          </p>
                          <p className="text-[11px] text-[#7A6870] mt-0.5">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="border-t border-[#F0E1E6] bg-[#FAF7F8]/40 p-3">
              <PaginationControl
                page={historyPage}
                totalPages={historyTotalPages}
                totalItems={historyTotal}
                limit={10}
                isLoading={historyLoading}
                onPageChange={(p) => {
                  setHistoryPage(p);
                  setHistoryLoading(true);
                }}
                itemLabel="stock adjustments"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <Dialog
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
      >
        <DialogContent className="rounded-[32px] sm:max-w-md p-6 bg-white border border-[#EEDFE5]">
          <DialogHeader className="pb-1">
            <div className="flex items-center gap-3">
              {adjustTarget && adjustTarget.images?.[0] && (
                <Image
                  src={adjustTarget.images[0]}
                  alt={adjustTarget.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-xl border border-[#F0E1E6] shrink-0 object-cover"
                />
              )}
              <div className="min-w-0">
                <DialogTitle className="font-serif text-xl font-bold text-[#38262E] truncate">
                  Adjust Stock Level
                </DialogTitle>
                <DialogDescription className="text-xs text-[#7A6870] truncate">
                  {adjustTarget?.name} · SKU: {adjustTarget?.sku}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-1">
            {/* Main Interactive Stepper & Stock Editor Container */}
            <div className="bg-[#FAF7F8] p-4 rounded-[24px] border border-[#EEDFE5] space-y-3.5">
              <div className="flex items-center justify-between text-xs text-[#7A6870]">
                <span>Current Stock Level</span>
                <span className="font-semibold text-[#38262E]">{currentStock} units</span>
              </div>

              {/* Direct Stock Stepper */}
              <div className="flex items-center justify-center gap-3 py-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-[16px] border-[#EEDFE5] hover:bg-[#FCEEF2] hover:text-[#B73D67] hover:border-[#B73D67] transition-all cursor-pointer disabled:opacity-30"
                  disabled={targetStock <= 0}
                  onClick={() => handleStepChange(-1)}
                  title="Deduct 1 unit"
                >
                  <Minus className="h-5 w-5 stroke-[2.5]" />
                </Button>

                <div className="flex flex-col items-center">
                  <Input
                    type="number"
                    min={0}
                    value={targetStockInput}
                    onChange={(e) => handleDirectInputChange(e.target.value)}
                    onBlur={handleDirectInputBlur}
                    className="w-32 h-14 text-center text-3xl font-black text-[#38262E] rounded-[18px] border-2 border-[#EEDFE5] focus:border-[#B73D67] bg-white shadow-xs"
                  />
                  <span className="text-[11px] text-[#7A6870] mt-1 font-medium">units</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-[16px] border-[#EEDFE5] hover:bg-[#EDF5EF] hover:text-[#3B775D] hover:border-[#3B775D] transition-all cursor-pointer"
                  onClick={() => handleStepChange(1)}
                  title="Add 1 unit"
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </Button>
              </div>

              {/* Live Transition Result Comparison */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[16px] bg-white border border-[#EEDFE5] text-xs">
                <span className="text-[#7A6870]">Stock Change:</span>
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-[#7A6870]">{currentStock}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#7A6870]" />
                  <span className="font-bold text-[#38262E]">{targetStock} units</span>
                  {stockDelta !== 0 ? (
                    <Badge
                      variant={stockDelta > 0 ? "success" : "destructive"}
                      className="text-xs px-2 py-0.5"
                    >
                      {stockDelta > 0 ? `+${stockDelta}` : stockDelta} units
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-[#7A6870]">
                      No change
                    </Badge>
                  )}
                </div>
              </div>

              {/* Quick Adjustment Shortcut Pills */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-[#7A6870]">
                  <span>Quick adjustments:</span>
                  {stockDelta !== 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetStock(currentStock);
                        setTargetStockInput(String(currentStock));
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#B73D67] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[-10, -5, -1, 1, 5, 10].map((step) => (
                    <Button
                      key={step}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 rounded-xl text-xs font-semibold border-[#EEDFE5]",
                        step < 0
                          ? "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                          : "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                      )}
                      onClick={() => handleStepChange(step)}
                    >
                      {step > 0 ? `+${step}` : step}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Adjustment Reason & Presets */}
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason" className="text-xs font-semibold text-[#38262E]">
                Adjustment Reason / Note
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap pb-1">
                {["Shipment Restock", "Inventory Count", "Damaged / Expired", "Store Display"].map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustReason(preset)}
                      className="px-2 py-0.5 rounded-full text-[11px] bg-[#FAF7F8] border border-[#EEDFE5] text-[#7A6870] hover:border-[#B73D67] hover:text-[#B73D67] transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  )
                )}
              </div>
              <Input
                id="adj-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Restock shipment arrived / Damaged item"
                className="h-10 rounded-xl border-[#EEDFE5]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setAdjustTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={stockDelta === 0}
                className={cn(
                  "rounded-xl text-white transition-all",
                  stockDelta < 0
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#B73D67] hover:bg-[#982F53]"
                )}
              >
                {stockDelta === 0
                  ? "No Changes to Apply"
                  : stockDelta < 0
                  ? `Apply Deduction (-${Math.abs(stockDelta)} units)`
                  : `Apply Restock (+${stockDelta} units)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

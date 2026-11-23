"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
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

  // Adjustment Dialog state
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [targetStock, setTargetStock] = useState<number>(0);
  const [targetStockInput, setTargetStockInput] = useState<string>("0");
  const [adjustReason, setAdjustReason] = useState("");

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (categoryFilter !== "all") sp.set("category", categoryFilter);
      if (stockFilter !== "all") sp.set("stock", stockFilter);
      if (search.trim()) sp.set("q", search.trim());

      const res = await fetch(`/api/inventory?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, stockFilter, search]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(historyPage),
        limit: "10",
      });
      const res = await fetch(`/api/inventory/history?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.history || []);
        setHistoryTotal(data.total || 0);
        setHistoryTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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

    // Refresh current paginated views
    fetchStock();
    fetchHistory();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
          {t.inventoryPageTitle}
        </h2>
        <p className="text-sm text-[#806B73]">
          {t.inventoryPageSubtitle}
        </p>
      </div>

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#806B73]">Total Products</p>
              <p className="text-2xl font-bold text-[#33272C] mt-1">
                {stats.total}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#FCEEF2] flex items-center justify-center">
              <Boxes className="h-5 w-5 text-[#D96B91]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#806B73]">In-Stock</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {stats.inStock}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#806B73]">Low-Stock Alerts</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {stats.lowStock}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#806B73]">Out-of-Stock</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {stats.outOfStock}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> {t.stockLevelsTab}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5 mr-1.5" /> {t.stockHistoryTab} (
            {historyTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search product or SKU..."
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
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="All Categories" />
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
                <SelectTrigger className="sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Statuses</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden md:table-cell">SKU</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead>Available Stock</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Threshold
                    </TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-[#806B73]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-[#D96B91]" />
                          <span className="text-xs">Fetching stock levels...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-[#806B73]">
                        <p className="text-sm font-medium text-[#33272C]">
                          No inventory records found
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => {
                      const isOut = p.stock === 0;
                      const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;

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
                                <span className="font-medium text-[#33272C] truncate max-w-[220px] block">
                                  {p.name}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs text-[#806B73]">
                            {p.sku}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs">
                            <span className="inline-flex items-center rounded-full bg-rose-50 border border-[#F2D4DE] px-2.5 py-0.5 text-xs font-medium text-[#D96B91]">
                              {getCategoryName(p.categoryId)}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {p.stock} units
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                            {p.lowStockThreshold} units
                          </TableCell>
                          <TableCell>
                            {isOut ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge variant="warning">Low Stock</Badge>
                            ) : (
                              <Badge variant="success">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
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

              {/* Stock Levels Pagination (Max 10 per page, server-fetched) */}
              <PaginationControl
                page={page}
                totalPages={totalPages}
                totalItems={total}
                limit={10}
                isLoading={isLoading}
                onPageChange={setPage}
                itemLabel="inventory items"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">By</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading && historyItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-[#806B73]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-[#D96B91]" />
                          <span className="text-xs">Fetching history logs...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : historyItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-[#806B73]">
                        <p className="text-sm font-medium text-[#33272C]">
                          No stock history logs yet
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <p className="font-medium text-[#33272C]">
                            {entry.productName}
                          </p>
                          <p className="text-[11px] font-mono text-[#806B73]">
                            {entry.sku}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.type === "increase" ? "success" : "destructive"
                            }
                          >
                            {entry.type === "increase" ? "+" : "-"}
                            {entry.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#806B73]">
                          {entry.previousStock} →{" "}
                          <span className="font-semibold text-[#33272C]">
                            {entry.newStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-[#33272C]">
                          {entry.reason}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                          {entry.performedBy}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-[#806B73]">
                          {formatDateTime(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Stock History Pagination (Max 10 per page, server-fetched) */}
              <PaginationControl
                page={historyPage}
                totalPages={historyTotalPages}
                totalItems={historyTotal}
                limit={10}
                isLoading={historyLoading}
                onPageChange={setHistoryPage}
                itemLabel="stock adjustments"
              />
            </CardContent>
          </Card>
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

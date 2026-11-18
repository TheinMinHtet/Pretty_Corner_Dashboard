"use client";

import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { Product } from "@/types/admin";
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
import { formatDateTime } from "@/lib/utils";

export default function InventoryPage() {
  const { products, categories, stockHistory, adjustStock } = useAdminStore();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");

  // Adjustment Dialog state
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<"increase" | "decrease">("increase");
  const [adjustQty, setAdjustQty] = useState("10");
  const [adjustReason, setAdjustReason] = useState("");

  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter(
      (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
    ).length;
    const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;
    return { total, inStock, lowStock, outOfStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (stockFilter === "out" && p.stock !== 0) return false;
      if (
        stockFilter === "low" &&
        (p.stock === 0 || p.stock > p.lowStockThreshold)
      )
        return false;
      if (stockFilter === "in" && p.stock <= p.lowStockThreshold) return false;
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, stockFilter]);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Beauty";

  const openAdjust = (product: Product, defaultType: "increase" | "decrease" = "increase") => {
    setAdjustTarget(product);
    setAdjustType(defaultType);
    setAdjustQty("10");
    setAdjustReason("");
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const qty = Number(adjustQty);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive quantity");
      return;
    }
    adjustStock(
      adjustTarget.id,
      adjustType,
      qty,
      adjustReason.trim() ||
        (adjustType === "increase" ? "Restock shipment" : "Manual stock deduction")
    );
    toast.success(
      `Stock ${adjustType === "increase" ? "increased" : "decreased"} by ${qty} for ${adjustTarget.name}`
    );
    setAdjustTarget(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
          Inventory Management
        </h2>
        <p className="text-sm text-[#806B73]">
          Monitor stock levels, handle restocks, and audit stock adjustment logs.
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
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Stock Levels
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5 mr-1.5" /> Stock History (
            {stockHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product or SKU..."
                  className="pl-9"
                />
              </div>
              <Select
                value={stockFilter}
                onValueChange={(v) =>
                  setStockFilter(v as "all" | "in" | "low" | "out")
                }
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
                  {filteredProducts.map((p) => {
                    const isOut = p.stock === 0;
                    const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-10 w-10 rounded-lg border border-[#F0E1E6] shrink-0"
                            />
                            <span className="font-medium text-[#33272C] truncate max-w-[200px]">
                              {p.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs text-[#806B73]">
                          {p.sku}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-[#806B73]">
                          {getCategoryName(p.categoryId)}
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
                            variant="primarySoft"
                            size="sm"
                            onClick={() => openAdjust(p, isOut || isLow ? "increase" : "decrease")}
                          >
                            Adjust Stock
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                  {stockHistory.map((entry) => (
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <Dialog
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {adjustTarget?.name} (Current: {adjustTarget?.stock} units)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustType === "increase" ? "default" : "outline"}
                onClick={() => setAdjustType("increase")}
              >
                <Plus className="h-4 w-4" /> Increase Stock
              </Button>
              <Button
                type="button"
                variant={adjustType === "decrease" ? "destructive" : "outline"}
                onClick={() => setAdjustType("decrease")}
              >
                <Minus className="h-4 w-4" /> Decrease Stock
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-qty">Quantity</Label>
              <Input
                id="adj-qty"
                type="number"
                min={1}
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
              />
              {adjustTarget && (
                <p className="text-xs text-[#806B73]">
                  New stock will be:{" "}
                  <span className="font-semibold text-[#33272C]">
                    {adjustType === "increase"
                      ? adjustTarget.stock + (Number(adjustQty) || 0)
                      : Math.max(0, adjustTarget.stock - (Number(adjustQty) || 0))}{" "}
                    units
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">Adjustment Reason</Label>
              <Input
                id="adj-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Restock shipment arrived / Damaged item"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Apply Adjustment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

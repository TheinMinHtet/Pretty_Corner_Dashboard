"use client";

import React, { useState } from "react";
import { Plus, Pencil, Trash2, Tag, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { Promotion } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PromotionsPage() {
  const {
    promotions,
    products,
    addPromotion,
    updatePromotion,
    deletePromotion,
  } = useAdminStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [code, setCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("15");
  const [startDate, setStartDate] = useState("2026-11-18");
  const [endDate, setEndDate] = useState("2026-12-18");
  const [active, setActive] = useState(true);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setSubtitle("");
    setCode("");
    setDiscountPercentage("15");
    setStartDate("2026-11-18");
    setEndDate("2026-12-18");
    setActive(true);
    setFeaturedProductIds([]);
    setDialogOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setTitle(p.title);
    setSubtitle(p.subtitle);
    setCode(p.code);
    setDiscountPercentage(String(p.discountPercentage));
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setActive(p.active);
    setFeaturedProductIds(p.featuredProductIds);
    setDialogOpen(true);
  };

  const toggleFeaturedProduct = (prodId: string) => {
    setFeaturedProductIds((prev) =>
      prev.includes(prodId)
        ? prev.filter((id) => id !== prodId)
        : [...prev, prodId]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(discountPercentage);
    if (!title.trim() || !code.trim() || Number.isNaN(pct) || pct <= 0 || pct > 90) {
      toast.error("Provide a campaign title, promo code, and valid discount (1–90%)");
      return;
    }

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      code: code.trim().toUpperCase(),
      discountPercentage: pct,
      startDate,
      endDate,
      active,
      bannerColor: "#FCEEF2",
      featuredProductIds,
    };

    if (editing) {
      updatePromotion(editing.id, payload);
      toast.success(`Updated promotion "${payload.title}"`);
    } else {
      addPromotion(payload);
      toast.success(`Created promotion "${payload.title}"`);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            Promotions & Campaigns
          </h2>
          <p className="text-sm text-[#806B73]">
            Create seasonal beauty banners, promo codes, and featured product drops.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Promotion
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {promotions.map((promo) => {
          const featuredItems = products.filter((p) =>
            promo.featuredProductIds.includes(p.id)
          );
          return (
            <Card key={promo.id} className="overflow-hidden">
              <div
                className="px-5 py-4 border-b border-[#F0E1E6] flex items-center justify-between gap-3"
                style={{ backgroundColor: promo.bannerColor }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#D96B91] border border-[#F0E1E6]">
                      <Tag className="h-3 w-3" /> {promo.discountPercentage}% OFF
                    </span>
                    <span className="rounded-md bg-[#33272C] px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                      {promo.code}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-[#33272C] mt-2 truncate">
                    {promo.title}
                  </h3>
                  <p className="text-xs text-[#806B73] truncate">
                    {promo.subtitle}
                  </p>
                </div>
                <Badge variant={promo.active ? "success" : "secondary"}>
                  {promo.active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#806B73]">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#D96B91]" />
                    {promo.startDate} → {promo.endDate}
                  </span>
                  <span>Used {promo.usageCount} times</span>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#806B73] mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-[#D96B91]" /> Featured
                    Products ({featuredItems.length})
                  </p>
                  {featuredItems.length === 0 ? (
                    <p className="text-xs text-[#806B73]">
                      Applies storewide across eligible items
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {featuredItems.map((fp) => (
                        <span
                          key={fp.id}
                          className="rounded-lg border border-[#F0E1E6] bg-[#FDF6F8] px-2.5 py-1 text-xs text-[#33272C]"
                        >
                          {fp.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#F0E1E6] pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={promo.active}
                      onCheckedChange={(checked) => {
                        updatePromotion(promo.id, { active: checked });
                        toast.success(
                          `${promo.title} ${checked ? "activated" : "paused"}`
                        );
                      }}
                    />
                    <span className="text-xs text-[#806B73]">
                      {promo.active ? "Campaign Live" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(promo)}
                      aria-label="Edit promotion"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        deletePromotion(promo.id);
                        toast.success(`Deleted promotion "${promo.title}"`);
                      }}
                      aria-label="Delete promotion"
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Promotion Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Promotion" : "Create Promotion"}
            </DialogTitle>
            <DialogDescription>
              Set up discount percentage, campaign dates, and featured items.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Campaign Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Holiday Rose Glow Edit"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Banner Subtitle</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g., 15% off all Korean skincare & lip tints"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Promo Code *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="GLOW15"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount Percentage (%) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Featured Products (optional)</Label>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-[#F0E1E6] p-2.5 space-y-1.5">
                {products.slice(0, 10).map((p) => {
                  const selected = featuredProductIds.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleFeaturedProduct(p.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#FCEEF2] text-[#D96B91] font-semibold"
                          : "hover:bg-[#FDF6F8] text-[#33272C]"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span>{selected ? "Selected" : "+ Add"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#F0E1E6] p-3">
              <span className="text-xs font-semibold text-[#33272C]">
                Active Campaign
              </span>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editing ? "Save Changes" : "Create Promotion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

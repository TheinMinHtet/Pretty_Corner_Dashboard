"use client";

import React, { useState } from "react";
import NextImage from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Calendar,
  Sparkles,
  Image as ImageIcon,
  Upload,
  X,
  Eye,
  ZoomIn,
  Copy,
  Check,
} from "lucide-react";
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

const PRESET_BANNERS = [
  { label: "Hero Boutique", url: "/assets/hero-banner.jpg" },
  { label: "Dew Drop Studio", url: "/assets/dew-drop-photograph.png" },
  { label: "Beauty Banner", url: "/assets/hero.png" },
];

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

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [code, setCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("15");
  const [startDate, setStartDate] = useState("2026-11-18");
  const [endDate, setEndDate] = useState("2026-12-18");
  const [active, setActive] = useState(true);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [bannerImage, setBannerImage] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Lightbox full-size preview
  const [lightboxData, setLightboxData] = useState<{
    imageUrl: string;
    title: string;
    code: string;
    discount: number;
  } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBannerImage(reader.result);
        toast.success("Banner image loaded successfully");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
    setBannerImage("/assets/hero-banner.jpg");
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
    setBannerImage(p.bannerImage || "");
    setDialogOpen(true);
  };

  const toggleFeaturedProduct = (prodId: string) => {
    setFeaturedProductIds((prev) =>
      prev.includes(prodId)
        ? prev.filter((id) => id !== prodId)
        : [...prev, prodId]
    );
  };

  const copyPromoCode = (promoCode: string) => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(promoCode);
    toast.success(`Copied code "${promoCode}" to clipboard`);
    setTimeout(() => {
      setCopiedCode((curr) => (curr === promoCode ? null : curr));
    }, 2000);
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
      bannerImage: bannerImage.trim() || undefined,
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
    <div suppressHydrationWarning className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 suppressHydrationWarning className="font-serif text-3xl font-bold tracking-tight text-[#33272C]">
            Promotions & Campaigns
          </h2>
          <p className="text-sm text-[#806B73] mt-1">
            Curate high-impact seasonal boutique banners, discount codes, and hero product drops.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="rounded-full bg-[#B73D67] hover:bg-[#982F53] text-white px-5 shadow-sm transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Promotion
        </Button>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {promotions.map((promo) => {
          const featuredItems = products.filter((p) =>
            promo.featuredProductIds.includes(p.id)
          );

          return (
            <Card
              key={promo.id}
              className="overflow-hidden rounded-[32px] border border-[#F0E1E6] bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:border-[#D96B91]/40 flex flex-col justify-between"
            >
              <div>
                {/* Crystal-Clear Banner Presentation */}
                {promo.bannerImage ? (
                  <div
                    onClick={() =>
                      setLightboxData({
                        imageUrl: promo.bannerImage!,
                        title: promo.title,
                        code: promo.code,
                        discount: promo.discountPercentage,
                      })
                    }
                    className="relative w-full aspect-[21/9] sm:aspect-[2/1] bg-[#FAF7F8] overflow-hidden rounded-t-[30px] border-b border-[#F0E1E6] group cursor-pointer"
                  >
                    <NextImage
                      src={promo.bannerImage}
                      alt={promo.title}
                      width={600}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Floating Badges (Floating on top, non-obscuring) */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm border border-white/20">
                        <Tag className="h-3 w-3 text-[#E99AB5]" />
                        {promo.discountPercentage}% OFF
                      </span>
                      <Badge
                        variant={promo.active ? "success" : "secondary"}
                        className="shadow-sm backdrop-blur-md"
                      >
                        {promo.active ? "Campaign Live" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Hover Inspect Cue */}
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-[#33272C] shadow-lg">
                        <Eye className="h-3.5 w-3.5 text-[#B73D67]" /> Click to Enlarge Banner
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative w-full aspect-[21/9] sm:aspect-[2/1] rounded-t-[30px] p-5 flex flex-col justify-between border-b border-[#F0E1E6]"
                    style={{ backgroundColor: promo.bannerColor || "#FCEEF2" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#B73D67] border border-[#F0E1E6] shadow-2xs">
                        <Tag className="h-3 w-3" /> {promo.discountPercentage}% OFF
                      </span>
                      <Badge variant={promo.active ? "success" : "secondary"}>
                        {promo.active ? "Campaign Live" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#806B73] font-medium">
                        No custom image uploaded
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(promo)}
                        className="rounded-full text-xs h-7 bg-white/90 border-[#F0E1E6]"
                      >
                        <Upload className="h-3 w-3 mr-1" /> Add Image
                      </Button>
                    </div>
                  </div>
                )}

                {/* Card Content & Details */}
                <CardContent className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-serif text-xl font-bold text-[#33272C] tracking-tight line-clamp-1">
                        {promo.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => copyPromoCode(promo.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF7F8] hover:bg-[#FCEEF2] px-2.5 py-1 font-mono text-xs font-bold text-[#B73D67] border border-[#F0E1E6] transition-colors cursor-pointer"
                        title="Click to copy promo code"
                      >
                        {copiedCode === promo.code ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>{promo.code}</span>
                          </>
                        )}
                      </button>
                    </div>
                    {promo.subtitle && (
                      <p className="text-xs text-[#806B73] mt-1.5 leading-relaxed">
                        {promo.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#806B73] pt-1 border-t border-[#F0E1E6]">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#B73D67]" />
                      {promo.startDate} → {promo.endDate}
                    </span>
                    <span className="font-medium">
                      Used <strong className="text-[#33272C]">{promo.usageCount}</strong> times
                    </span>
                  </div>

                  {/* Featured Products */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#806B73] mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#B73D67]" /> Featured Drop Items (
                      {featuredItems.length})
                    </p>
                    {featuredItems.length === 0 ? (
                      <p className="text-xs text-[#806B73] italic">
                        Applies storewide across eligible beauty items
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {featuredItems.map((fp) => (
                          <span
                            key={fp.id}
                            className="rounded-full border border-[#F0E1E6] bg-[#FAF7F8] px-3 py-1 text-xs font-medium text-[#33272C]"
                          >
                            {fp.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Card Footer Controls */}
              <div className="px-6 pb-6 pt-2">
                <div className="flex items-center justify-between border-t border-[#F0E1E6] pt-4">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={promo.active}
                      onCheckedChange={(checked) => {
                        updatePromotion(promo.id, { active: checked });
                        toast.success(
                          `Promotion "${promo.title}" ${checked ? "activated" : "paused"}`
                        );
                      }}
                    />
                    <span className="text-xs font-semibold text-[#806B73]">
                      {promo.active ? "Campaign Live" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {promo.bannerImage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setLightboxData({
                            imageUrl: promo.bannerImage!,
                            title: promo.title,
                            code: promo.code,
                            discount: promo.discountPercentage,
                          })
                        }
                        title="Enlarge image"
                        className="rounded-full h-8 w-8 text-[#806B73] hover:text-[#33272C]"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(promo)}
                      aria-label="Edit promotion"
                      className="rounded-full h-8 w-8 text-[#806B73] hover:text-[#33272C]"
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
                      className="rounded-full h-8 w-8 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Promotion Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-[32px] p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#33272C]">
              {editing ? "Edit Promotion" : "Create New Promotion"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#806B73]">
              Configure promotion banner visuals, discount percentages, promo codes, and campaign scheduling.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5 pt-2">
            {/* Dedicated Banner Image Section */}
            <div className="rounded-[24px] border border-[#F0E1E6] bg-[#FAF7F8] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#38262E] uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#B73D67]" /> Promotion Banner Image
                </Label>
                {bannerImage && (
                  <Badge variant="outline" className="text-[10px] text-[#B73D67] border-[#F1D3DF]">
                    Image Active
                  </Badge>
                )}
              </div>

              {/* Upload & URL Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Local File Upload Button */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#33272C]">Upload Local File</Label>
                  <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[#F1D3DF] hover:border-[#B73D67] bg-white hover:bg-[#FCEEF2]/40 rounded-2xl p-4 text-xs font-semibold text-[#B73D67] cursor-pointer transition-colors text-center group">
                    <Upload className="h-5 w-5 text-[#B73D67] transition-transform group-hover:-translate-y-0.5" />
                    <span>Choose Banner Image</span>
                    <span className="text-[10px] text-[#806B73] font-normal">
                      PNG, JPG, WebP up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Direct Image URL Input */}
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div>
                    <Label className="text-xs font-medium text-[#33272C]">Or Image URL / Path</Label>
                    <Input
                      value={bannerImage}
                      onChange={(e) => setBannerImage(e.target.value)}
                      placeholder="e.g. /assets/hero-banner.jpg or https://..."
                      className="text-xs bg-white rounded-xl mt-1.5"
                    />
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="pt-2">
                    <span className="text-[11px] text-[#806B73] block mb-1.5 font-medium">
                      Or Quick Select Preset Banner:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_BANNERS.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setBannerImage(preset.url)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer ${
                            bannerImage === preset.url
                              ? "bg-[#B73D67] text-white border-[#B73D67]"
                              : "bg-white text-[#33272C] border-[#F0E1E6] hover:bg-[#FCEEF2]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Box inside Modal */}
              {bannerImage ? (
                <div className="relative w-full aspect-[2.4/1] rounded-2xl overflow-hidden border border-[#F0E1E6] bg-white group shadow-2xs">
                  <NextImage
                    src={bannerImage}
                    alt="Banner Preview"
                    width={480}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-between p-3">
                    <span className="text-xs font-semibold text-white drop-shadow-xs">
                      Live Preview
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setBannerImage("")}
                      className="rounded-full h-7 text-xs px-3 shadow-md"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#F0E1E6] p-4 text-center bg-white">
                  <p className="text-xs text-[#806B73]">
                    No banner image selected. Upload an image or pick a preset above to make your promotion stand out.
                  </p>
                </div>
              )}
            </div>

            {/* Campaign Details Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-[#38262E]">Campaign Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Holiday Rose Glow Edit"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-[#38262E]">Banner Subtitle</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. 15% off all Korean skincare & UV daily defense"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#38262E]">Promo Code *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="GLOW15"
                  className="rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#38262E]">Discount Percentage (%) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#38262E]">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#38262E]">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Featured Products Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#38262E]">
                Featured Drop Items (optional)
              </Label>
              <div className="max-h-36 overflow-y-auto rounded-2xl border border-[#F0E1E6] p-2.5 space-y-1.5 bg-white">
                {products.slice(0, 10).map((p) => {
                  const selected = featuredProductIds.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleFeaturedProduct(p.id)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#FCEEF2] text-[#B73D67] font-bold"
                          : "hover:bg-[#FAF7F8] text-[#33272C]"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span>{selected ? "Selected" : "+ Add"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign Status Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-[#F0E1E6] p-4 bg-[#FAF7F8]">
              <div>
                <span className="text-xs font-bold text-[#33272C] block">
                  Active Campaign
                </span>
                <span className="text-[11px] text-[#806B73]">
                  When active, this banner is visible across the storefront and eligible for customer checkouts.
                </span>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[#B73D67] hover:bg-[#982F53] text-white"
              >
                {editing ? "Save Changes" : "Create Promotion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Interactive Lightbox Modal */}
      <Dialog
        open={!!lightboxData}
        onOpenChange={(open) => !open && setLightboxData(null)}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border border-white/10 rounded-[32px] text-white shadow-2xl">
          {lightboxData && (
            <div className="flex flex-col">
              {/* Lightbox Header Bar */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/60">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B73D67] px-3 py-1 text-xs font-bold text-white shadow-xs">
                    <Tag className="h-3 w-3" /> {lightboxData.discount}% OFF
                  </span>
                  <div>
                    <h3 className="font-serif text-base font-bold text-white">
                      {lightboxData.title}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      CODE: {lightboxData.code}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLightboxData(null)}
                  className="rounded-full h-8 w-8 text-neutral-300 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* High-Resolution Uncropped Image */}
              <div className="relative w-full max-h-[75vh] flex items-center justify-center p-4 bg-black/80">
                <NextImage
                  src={lightboxData.imageUrl}
                  alt={lightboxData.title}
                  width={1200}
                  height={600}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-xl"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

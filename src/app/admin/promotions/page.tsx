"use client";

import React, { useState } from "react";
import NextImage from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Calendar,
  Image as ImageIcon,
  Upload,
  X,
  Eye,
  Copy,
  Check,
  Link2,
  Layers,
  Package,
  Store,
  FolderTree,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { PromotionsPageSkeleton } from "@/components/skeletons/promotions-skeletons";
import { Promotion, PromotionTargetType, RedemptionMethod } from "@/types/admin";
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

const CATEGORY_OPTIONS = [
  { value: "skincare", label: "Skincare" },
  { value: "makeup", label: "Makeup & Cosmetics" },
  { value: "electrical", label: "Electrical & Styling" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "lenses", label: "Contact Lenses" },
  { value: "more", label: "More Finds" },
];

function deriveDestination(p: {
  targetType?: string;
  targetSlug?: string | null;
  slug?: string | null;
  code?: string;
  featuredProductIds?: string[];
}): string {
  const codeParam = p.code ? `promo=${encodeURIComponent(p.code)}` : "";
  const querySuffix = codeParam ? `?${codeParam}` : "";
  switch (p.targetType) {
    case "SINGLE_PRODUCT":
      return p.targetSlug
        ? `/shop?product=${encodeURIComponent(p.targetSlug)}${codeParam ? `&${codeParam}` : ""}`
        : `/shop${querySuffix}`;
    case "CATEGORY":
      return p.targetSlug
        ? `/shop?category=${encodeURIComponent(p.targetSlug)}${codeParam ? `&${codeParam}` : ""}`
        : `/shop${querySuffix}`;
    case "ENTIRE_STORE":
    default:
      return `/shop${querySuffix}`;
  }
}

export default function PromotionsPage() {
  const {
    promotions,
    products,
    addPromotion,
    updatePromotion,
    deletePromotion,
    hydrated,
  } = useAdminStore();
  const { t } = useLanguage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("15");
  const [startDate, setStartDate] = useState("2026-11-18");
  const [endDate, setEndDate] = useState("2026-12-18");
  const [active, setActive] = useState(true);
  const [targetType, setTargetType] = useState<PromotionTargetType>("ENTIRE_STORE");
  const [targetSlug, setTargetSlug] = useState("");
  const [redemptionMethod, setRedemptionMethod] = useState<RedemptionMethod>("CODE");
  const [usageLimit, setUsageLimit] = useState("");
  const [minimumOrderAmount, setMinimumOrderAmount] = useState("");
  const [isOutOfStock, setIsOutOfStock] = useState(false);
  const [ctaText, setCtaText] = useState("");
  const [, setFeaturedProductIds] = useState<string[]>([]);
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
    setSlug("");
    setDiscountPercentage("15");
    setStartDate("2026-11-18");
    setEndDate("2026-12-18");
    setActive(true);
    setTargetType("ENTIRE_STORE");
    setTargetSlug("");
    setRedemptionMethod("CODE");
    setUsageLimit("");
    setMinimumOrderAmount("");
    setIsOutOfStock(false);
    setCtaText("");
    setFeaturedProductIds([]);
    setBannerImage("/assets/hero-banner.jpg");
    setDialogOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setTitle(p.title);
    setSubtitle(p.subtitle || "");
    setCode(p.code);
    setSlug(p.slug || "");
    setDiscountPercentage(String(p.discountPercentage));
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setActive(p.active);
    setTargetType(p.targetType || "ENTIRE_STORE");
    setTargetSlug(p.targetSlug || "");
    setRedemptionMethod(p.redemptionMethod || "CODE");
    setUsageLimit(
      p.usageLimit !== undefined && p.usageLimit !== null ? String(p.usageLimit) : ""
    );
    setMinimumOrderAmount(
      p.minimumOrderAmount !== undefined && p.minimumOrderAmount !== null
        ? String(p.minimumOrderAmount)
        : ""
    );
    setIsOutOfStock(Boolean(p.isOutOfStock));
    setCtaText(p.ctaText || "");
    setFeaturedProductIds(p.featuredProductIds || []);
    setBannerImage(p.bannerImage || "");
    setDialogOpen(true);
  };

  const copyPromoCode = (promoCode: string) => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(promoCode);
    toast.success(`Copied code "${promoCode}" to clipboard`);
    setTimeout(() => {
      setCopiedCode((curr) => (curr === promoCode ? null : curr));
    }, 2000);
  };

  const copyRouteUrl = (route: string) => {
    navigator.clipboard.writeText(route);
    toast.success(`Copied destination link "${route}"`);
  };

  const handleSelectTier = (newTier: PromotionTargetType) => {
    setTargetType(newTier);
    if (newTier === "ENTIRE_STORE") {
      setTargetSlug("");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(discountPercentage);
    if (!title.trim() || !code.trim() || Number.isNaN(pct) || pct <= 0 || pct > 90) {
      toast.error("Provide a campaign title, promo code, and valid discount (1–90%)");
      return;
    }

    if (targetType === "SINGLE_PRODUCT" && !targetSlug.trim()) {
      toast.error("Please pick a designated product for Single Product promotion");
      return;
    }

    if (targetType === "CATEGORY" && !targetSlug.trim()) {
      toast.error("Please select a target category");
      return;
    }

    const autoSlug =
      slug.trim() ||
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      code: code.trim().toUpperCase(),
      slug: autoSlug || null,
      discountPercentage: pct,
      startDate,
      endDate,
      active,
      targetType,
      targetSlug:
        targetType === "SINGLE_PRODUCT" || targetType === "CATEGORY"
          ? targetSlug.trim() || null
          : null,
      redemptionMethod,
      usageLimit: usageLimit.trim() ? Number(usageLimit) : null,
      minimumOrderAmount: minimumOrderAmount.trim() ? Number(minimumOrderAmount) : 0,
      isOutOfStock,
      ctaText: ctaText.trim() || null,
      ctaLink: null,
      bannerColor: "#FCEEF2",
      bannerImage: bannerImage.trim() || null,
      featuredProductIds: [],
    };

    if (editing) {
      updatePromotion(editing.id, payload);
      toast.success(`Updated promotion "${payload.title}" to ${targetType.replace('_', ' ')}`);
    } else {
      addPromotion(payload);
      toast.success(`Created promotion "${payload.title}"`);
    }
    setDialogOpen(false);
  };

  const currentPreviewDestination = deriveDestination({
    targetType,
    targetSlug,
    slug: slug.trim() || (code.trim() ? code.trim().toLowerCase() : undefined),
    code: code.trim().toUpperCase(),
  });

  if (!hydrated) {
    return <PromotionsPageSkeleton />;
  }

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 suppressHydrationWarning className="font-serif text-3xl font-black tracking-tight text-[#33272C]">
            {t.promotionsPageTitle}
          </h2>
          <p className="text-sm text-[#806B73] mt-1">
            {t.promotionsPageSubtitle}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="rounded-full bg-[#B73D67] hover:bg-[#982F53] text-white px-5 shadow-sm transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-1.5" /> {t.newPromotionBtn}
        </Button>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {promotions.map((promo) => {
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

                    {/* Floating Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm border border-white/20">
                          <Tag className="h-3 w-3 text-[#E99AB5]" />
                          {promo.discountPercentage}% OFF
                        </span>
                        {promo.isOutOfStock && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                            <AlertTriangle className="h-3 w-3" /> Depleted
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={promo.active && !promo.isOutOfStock ? "success" : "secondary"}
                        className="shadow-sm backdrop-blur-md"
                      >
                        {promo.isOutOfStock
                          ? "Out of Stock"
                          : promo.active
                          ? "Campaign Live"
                          : "Inactive"}
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
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#B73D67] border border-[#F0E1E6] shadow-2xs">
                          <Tag className="h-3 w-3" /> {promo.discountPercentage}% OFF
                        </span>
                        {promo.isOutOfStock && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                            Depleted
                          </span>
                        )}
                      </div>
                      <Badge variant={promo.active && !promo.isOutOfStock ? "success" : "secondary"}>
                        {promo.isOutOfStock
                          ? "Out of Stock"
                          : promo.active
                          ? "Campaign Live"
                          : "Inactive"}
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

                  {/* Target Scope & Redemption Mode */}
                  <div className="bg-[#FAF7F8] rounded-2xl p-3 border border-[#F0E1E6]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#33272C]">
                        {promo.targetType === "SINGLE_PRODUCT" && (
                          <>
                            <Package className="h-3.5 w-3.5 text-[#B73D67]" />
                            <span>Single Product: <span className="font-mono text-[#B73D67]">{promo.targetSlug || "Designated Item"}</span></span>
                          </>
                        )}
                        {promo.targetType === "CATEGORY" && (
                          <>
                            <FolderTree className="h-3.5 w-3.5 text-[#B73D67]" />
                            <span>Category: <span className="capitalize text-[#B73D67]">{promo.targetSlug || "All"}</span></span>
                          </>
                        )}
                        {(!promo.targetType || promo.targetType === "ENTIRE_STORE") && (
                          <>
                            <Store className="h-3.5 w-3.5 text-[#B73D67]" />
                            <span>Storewide Catalog</span>
                          </>
                        )}
                      </span>

                      <span className="text-[11px] font-medium text-[#806B73]">
                        {promo.redemptionMethod === "AUTOMATIC" ? "Auto-Applied" : "Voucher Code"}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#806B73] pt-1 border-t border-[#F0E1E6]">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#B73D67]" />
                      {promo.startDate} → {promo.endDate}
                    </span>
                    <span className="font-medium">
                      Quota:{" "}
                      <strong className="text-[#33272C] font-mono">
                        {promo.usageCount} / {promo.usageLimit !== undefined && promo.usageLimit !== null ? promo.usageLimit : "∞"}
                      </strong>
                    </span>
                  </div>

                  {/* Minimum Order Threshold */}
                  {promo.minimumOrderAmount ? (
                    <div className="text-[11px] text-[#806B73] flex items-center justify-between">
                      <span>Minimum Spend Requirement:</span>
                      <strong className="text-[#38262E]">
                        {promo.minimumOrderAmount.toLocaleString()} MMK
                      </strong>
                    </div>
                  ) : null}
                </CardContent>
              </div>

              {/* Card Footer Controls */}
              <div className="px-6 pb-6 pt-2">
                <div className="flex items-center justify-between border-t border-[#F0E1E6] pt-4">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={promo.active}
                      onCheckedChange={(checked) =>
                        updatePromotion(promo.id, { active: checked })
                      }
                    />
                    <span className="text-xs font-semibold text-[#33272C]">
                      {promo.active ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(promo)}
                      className="rounded-full h-8 px-3 text-xs text-[#33272C] hover:bg-[#FAF7F8] hover:text-[#B73D67]"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete promotion "${promo.title}"?`)) {
                          deletePromotion(promo.id);
                          toast.success("Promotion deleted");
                        }
                      }}
                      className="rounded-full h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] p-6 sm:p-8 bg-white border border-[#F0E1E6] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-[#33272C]">
              {editing ? "Edit Promotion & Routing" : "Create New Promotion"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#806B73]">
              Configure promotional campaign targets, destination routing, coupon code, and multi-factor deactivation rules.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5 pt-3">
            {/* Banner Image Customizer */}
            <div className="space-y-3 rounded-2xl bg-[#FAF7F8] p-4 border border-[#F0E1E6]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#38262E] flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-[#B73D67]" /> Banner Image Configuration
                </span>
                <span className="text-[11px] text-[#806B73]">Hero slide resolution (16:9 / 2:1)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Upload Local File */}
                <div>
                  <Label className="text-xs font-medium text-[#33272C] block mb-1.5">
                    Upload from Device
                  </Label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#F0E1E6] rounded-xl p-3 bg-white hover:bg-[#FCEEF2]/50 hover:border-[#D96B91] cursor-pointer transition-colors group">
                    <Upload className="h-5 w-5 text-[#806B73] group-hover:text-[#B73D67] mb-1 transition-colors" />
                    <span className="text-xs font-semibold text-[#33272C]">Browse image</span>
                    <span className="text-[10px] text-[#806B73]">PNG, JPG, WebP</span>
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

            {/* Target Tier Selection (4-Tier Routing Engine) */}
            <div className="space-y-3 rounded-2xl bg-[#FAF7F8] p-4 border border-[#F0E1E6]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#38262E] flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#B73D67]" /> Promotional Target Tier
                </span>
                <span className="text-[11px] text-[#806B73]">Governs destination routing and discount scope</span>
              </div>

              {/* Tier Selection Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "ENTIRE_STORE", label: "Storewide", desc: "Whole Catalog", icon: Store },
                  { id: "CATEGORY", label: "Category", desc: "Specific Line", icon: FolderTree },
                  { id: "SINGLE_PRODUCT", label: "Hero Item", desc: "Single Product", icon: Package },
                ].map((tier) => {
                  const isSelected = targetType === tier.id;
                  const Icon = tier.icon;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleSelectTier(tier.id as PromotionTargetType)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#B73D67] text-white border-[#B73D67] shadow-sm"
                          : "bg-white text-[#33272C] border-[#F0E1E6] hover:bg-[#FCEEF2]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-[#B73D67]"}`} />
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-bold leading-tight">{tier.label}</span>
                      <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[#806B73]"}`}>
                        {tier.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dependent Entity Selectors based on Target Tier */}
              {targetType === "CATEGORY" && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-[#38262E]">Choose Target Category</Label>
                  <select
                    value={targetSlug}
                    onChange={(e) => setTargetSlug(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#F0E1E6] bg-white text-xs font-medium text-[#38262E] focus:outline-none focus:border-[#B73D67]"
                  >
                    <option value="">Select category...</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label} ({c.value})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "SINGLE_PRODUCT" && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-[#38262E]">Select Hero Product</Label>
                  <select
                    value={targetSlug}
                    onChange={(e) => setTargetSlug(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#F0E1E6] bg-white text-xs font-medium text-[#38262E] focus:outline-none focus:border-[#B73D67]"
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.slug || p.id}>
                        {p.name} ({p.sku}) — Stock: {p.stock}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Real-time Destination Route Preview Pill */}
              <div className="mt-2 bg-white p-2.5 rounded-xl border border-[#F0E1E6] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Link2 className="h-3.5 w-3.5 text-[#B73D67] shrink-0" />
                  <span className="font-semibold text-[#806B73]">Derived Route:</span>
                  <span className="font-mono text-[#33272C] truncate font-medium">
                    {currentPreviewDestination}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyRouteUrl(currentPreviewDestination)}
                  className="text-[11px] font-bold text-[#B73D67] hover:underline shrink-0 cursor-pointer"
                >
                  Copy Link
                </button>
              </div>
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

              {/* Usage Quota Limit */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#38262E]">Usage Quota Limit (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="e.g. 50 (blank for unlimited)"
                  className="rounded-xl"
                />
              </div>

              {/* Minimum Order Threshold */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#38262E]">Min. Order Amount (MMK)</Label>
                <Input
                  type="number"
                  min={0}
                  step={500}
                  value={minimumOrderAmount}
                  onChange={(e) => setMinimumOrderAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="rounded-xl"
                />
              </div>

              {/* Custom CTA Label */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-[#38262E]">Custom CTA Label (optional)</Label>
                <Input
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g. Explore Collection"
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Campaign Out-of-stock & Live Status Toggles */}
            <div className="space-y-2 rounded-2xl border border-[#F0E1E6] p-4 bg-[#FAF7F8]">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0E1E6]">
                <div>
                  <span className="text-xs font-bold text-[#33272C] block">
                    Active Campaign
                  </span>
                  <span className="text-[11px] text-[#806B73]">
                    When active, this banner is displayed in storefront hero rotation.
                  </span>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-bold text-[#33272C] block">
                    Depleted / Out of Stock State
                  </span>
                  <span className="text-[11px] text-[#806B73]">
                    Immediately pulls promotion from hero slider and blocks checkout redemptions.
                  </span>
                </div>
                <Switch checked={isOutOfStock} onCheckedChange={setIsOutOfStock} />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-full cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[#B73D67] hover:bg-[#982F53] text-white cursor-pointer"
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
                  className="rounded-full h-8 w-8 text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
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

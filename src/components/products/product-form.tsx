"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Upload, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { Product, ProductStatus } from "@/types/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductFormProps {
  initialProduct?: Product;
  mode: "create" | "edit";
}

const DEFAULT_PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="20" fill="#FCEEF2"/><text x="80" y="88" text-anchor="middle" font-size="36">✨</text></svg>`
  );

import { normalizeProductSpecification } from "@/modules/catalog/catalog-sync";

export function ProductForm({ initialProduct, mode }: ProductFormProps) {
  const router = useRouter();
  const { categories, addProduct, updateProduct, settings } = useAdminStore();
  const { t } = useLanguage();

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [description, setDescription] = useState(
    initialProduct?.description ?? ""
  );
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId ?? categories[0]?.id ?? "cat-lenses"
  );
  const [brand, setBrand] = useState(initialProduct?.brand ?? "Pretty Corner");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [price, setPrice] = useState(
    initialProduct
      ? String(initialProduct.salePrice ?? initialProduct.regularPrice)
      : ""
  );
  const [stock, setStock] = useState(
    initialProduct ? String(initialProduct.stock) : "20"
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialProduct
      ? String(initialProduct.lowStockThreshold)
      : String(settings.defaultLowStockThreshold)
  );
  const [status, setStatus] = useState<ProductStatus>(
    initialProduct?.status ?? "Active"
  );
  const [images, setImages] = useState<string[]>(
    initialProduct?.images ?? []
  );
  const [benefitsText, setBenefitsText] = useState(
    initialProduct?.benefits?.join("\n") ?? ""
  );
  const [usage, setUsage] = useState(initialProduct?.usage ?? "");
  const [badge, setBadge] = useState(initialProduct?.badge ?? "");
  const [tagline, setTagline] = useState(initialProduct?.tagline ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const compressImage = (file: File, maxDim = 600, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return resolve("");
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", quality));
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image file is too large (max 10MB).");
        continue;
      }
      try {
        const compressed = await compressImage(file);
        if (compressed) {
          setImages((prev) => [...prev, compressed]);
        }
      } catch (err) {
        console.error("Failed to compress image:", err);
      }
    }
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedBenefits = benefitsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const normalized = normalizeProductSpecification({
      name,
      description,
      categoryId,
      brand,
      sku,
      regularPrice: price,
      images: images.length > 0 ? images : [DEFAULT_PLACEHOLDER_IMG],
      stock,
      lowStockThreshold,
      status,
      benefits: parsedBenefits,
      usage,
      badge,
      tagline,
    });

    if (!normalized.isValid) {
      setErrors(normalized.errors);
      toast.error("Please fix the highlighted form errors");
      return;
    }

    setErrors({});
    const payload = normalized.product;

    if (mode === "create") {
      addProduct(payload);
      toast.success(`Created "${payload.name}"`);
    } else if (initialProduct) {
      updateProduct(initialProduct.id, payload);
      toast.success(`Saved changes to "${payload.name}"`);
    }
    router.push("/admin/products");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/products" aria-label="Back to products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
              {mode === "create"
                ? t.addNewProductTitle
                : `${t.editProductPrefix} ${initialProduct?.name}`}
            </h2>
            <p className="text-xs text-[#806B73]">
              {t.productFormSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.generalInfoTitle}</CardTitle>
              <CardDescription>{t.generalInfoDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">{t.productNameLabel}</Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Olens ViVi Ring Choco Monthly"
                />
                {errors.name && (
                  <p className="text-xs text-rose-600">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-desc">{t.productDescriptionLabel}</Label>
                <Textarea
                  id="prod-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe ingredients, wear comfort, shade details..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t.productCategoryLabel}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-brand">{t.productBrandLabel}</Label>
                  <Input
                    id="prod-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g., OLENS, rom&nd, Pretty Corner"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storefront Content: Why We Love It & How to Use */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.storefrontContentTitle}</CardTitle>
              <CardDescription>
                {t.storefrontContentDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-badge">{t.badgeOptionalLabel}</Label>
                  <Input
                    id="prod-badge"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g., BESTSELLER, NEW, DAILY ESSENTIAL"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prod-tagline">{t.taglineOptionalLabel}</Label>
                  <Input
                    id="prod-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g., HYDRATE + PLUMP"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-benefits">
                  {t.whyWeLoveItLabel}
                </Label>
                <Textarea
                  id="prod-benefits"
                  rows={4}
                  value={benefitsText}
                  onChange={(e) => setBenefitsText(e.target.value)}
                  placeholder={"Deep hydration with multi-molecular hyaluronic acid\nUltra-lightweight finish that sinks in effortlessly\nSuitable for all skin types"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-usage">{t.howToUseLabel}</Label>
                <Textarea
                  id="prod-usage"
                  rows={3}
                  value={usage}
                  onChange={(e) => setUsage(e.target.value)}
                  placeholder="After gentle cleansing and toning, dispense 2–3 drops..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Images */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.productImagesTitle}</CardTitle>
              <CardDescription>
                {t.productImagesDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group h-24 w-24 rounded-xl border border-[#F0E1E6] overflow-hidden bg-[#FDF6F8]"
                  >
                    <Image
                      src={img}
                      alt={`Product image ${idx + 1}`}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-[#33272C] shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E99AB5]/60 bg-[#FCEEF2]/30 text-[#D96B91] hover:bg-[#FCEEF2]/60 transition-colors">
                  <Upload className="h-5 w-5" />
                  <span className="mt-1 text-[11px] font-medium">{t.uploadLabel}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pricing, Inventory, Status */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.statusCol}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Label>{t.productVisibilityLabel}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProductStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.pricingMmkTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-price">{t.priceMmkLabel}</Label>
                <Input
                  id="prod-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="28000"
                />
                {errors.regularPrice && (
                  <p className="text-xs text-rose-600">{errors.regularPrice}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.inventorySkuTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sku">{t.skuLabel}</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="PC-CL-104"
                />
                {errors.sku && (
                  <p className="text-xs text-rose-600">{errors.sku}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock">{t.stockQuantityLabel}</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
                {errors.stock && (
                  <p className="text-xs text-rose-600">{errors.stock}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="threshold">{t.lowStockThresholdLabel}</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons below Inventory & SKU */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" type="button" asChild>
              <Link href="/admin/products">{t.cancelBtn}</Link>
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              {mode === "create" ? t.createProductBtn : t.saveChangesBtn}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

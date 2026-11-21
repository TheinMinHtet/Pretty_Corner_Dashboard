"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Upload,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateId } from "@/lib/utils";

interface ProductFormProps {
  initialProduct?: Product;
  mode: "create" | "edit";
}

const DEFAULT_PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="20" fill="#FCEEF2"/><text x="80" y="88" text-anchor="middle" font-size="36">✨</text></svg>`
  );

export function ProductForm({ initialProduct, mode }: ProductFormProps) {
  const router = useRouter();
  const { categories, addProduct, updateProduct, settings } = useAdminStore();

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [description, setDescription] = useState(
    initialProduct?.description ?? ""
  );
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId ?? categories[0]?.id ?? "cat-lenses"
  );
  const [brand, setBrand] = useState(initialProduct?.brand ?? "Pretty Corner");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [regularPrice, setRegularPrice] = useState(
    initialProduct?.regularPrice ? String(initialProduct.regularPrice) : ""
  );
  const [salePrice, setSalePrice] = useState(
    initialProduct?.salePrice ? String(initialProduct.salePrice) : ""
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
  const [isContactLens, setIsContactLens] = useState(
    initialProduct?.isContactLens ?? false
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Product name is required";
    if (!sku.trim()) nextErrors.sku = "SKU is required";
    const reg = Number(regularPrice);
    if (!regularPrice || Number.isNaN(reg) || reg <= 0) {
      nextErrors.regularPrice = "Enter a valid regular price (> 0)";
    }
    if (salePrice.trim()) {
      const sale = Number(salePrice);
      if (Number.isNaN(sale) || sale <= 0) {
        nextErrors.salePrice = "Sale price must be greater than 0";
      } else if (sale >= reg) {
        nextErrors.salePrice = "Sale price must be less than regular price";
      }
    }
    const stk = Number(stock);
    if (Number.isNaN(stk) || stk < 0) {
      nextErrors.stock = "Stock cannot be negative";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted form errors");
      return;
    }

    const parsedBenefits = benefitsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      brand: brand.trim() || "Pretty Corner",
      sku: sku.trim().toUpperCase(),
      regularPrice: Number(regularPrice),
      salePrice: salePrice.trim() ? Number(salePrice) : undefined,
      images: images.length > 0 ? images : [DEFAULT_PLACEHOLDER_IMG],
      stock: Number(stock),
      lowStockThreshold: Math.max(0, Number(lowStockThreshold) || 10),
      status,
      isContactLens,
      variants: [],
      benefits: parsedBenefits,
      usage: usage.trim(),
      badge: badge.trim() || undefined,
      tagline: tagline.trim() || undefined,
    };

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
              {mode === "create" ? "Add New Product" : `Edit ${initialProduct?.name}`}
            </h2>
            <p className="text-xs text-[#806B73]">
              Configure pricing, stock levels, images, and beauty variants
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            {mode === "create" ? "Create Product" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic product identity and copy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">Product Name *</Label>
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
                <Label htmlFor="prod-desc">Description</Label>
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
                  <Label>Category</Label>
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
                  <Label htmlFor="prod-brand">Brand</Label>
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
              <CardTitle>Storefront Content</CardTitle>
              <CardDescription>
                Controls the &ldquo;Why we love it&rdquo; and &ldquo;How to use&rdquo; sections on the customer product page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-badge">Badge (Optional)</Label>
                  <Input
                    id="prod-badge"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g., BESTSELLER, NEW, DAILY ESSENTIAL"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prod-tagline">Tagline (Optional)</Label>
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
                  Why We Love It — Key Benefits (one bullet per line)
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
                <Label htmlFor="prod-usage">How to Use</Label>
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
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Upload local images for instant preview (stored in browser state)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group h-24 w-24 rounded-xl border border-[#F0E1E6] overflow-hidden bg-[#FDF6F8]"
                  >
                    <img
                      src={img}
                      alt={`Product ${idx + 1}`}
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
                  <span className="mt-1 text-[11px] font-medium">Upload</span>
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
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Label>Product Visibility</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProductStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Pricing (MMK)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-price">Regular Price (MMK) *</Label>
                <Input
                  id="reg-price"
                  type="number"
                  min={0}
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(e.target.value)}
                  placeholder="28000"
                />
                {errors.regularPrice && (
                  <p className="text-xs text-rose-600">{errors.regularPrice}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sale-price">Sale Price (MMK)</Label>
                <Input
                  id="sale-price"
                  type="number"
                  min={0}
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="Optional discounted price"
                />
                {errors.salePrice && (
                  <p className="text-xs text-rose-600">{errors.salePrice}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Inventory & SKU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
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
                <Label htmlFor="stock">Stock Quantity</Label>
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
                <Label htmlFor="threshold">Low-Stock Threshold</Label>
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
        </div>
      </div>
    </form>
  );
}

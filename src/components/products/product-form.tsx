"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Trash2,
  Upload,
  Save,
  X,
  Plus,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { Product, ProductStatus, ProductVariant } from "@/types/admin";
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

import {
  normalizeProductSpecification,
  createContactLensPresets,
} from "@/modules/catalog/catalog-sync";

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
    initialProduct?.isContactLens ?? (initialProduct?.categoryId === "cat-lenses" || false)
  );
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialProduct?.variants ? [...initialProduct.variants] : []
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

  // Quick Variant Input State
  const [variantLabelInput, setVariantLabelInput] = useState("");
  const [variantQtyInput, setVariantQtyInput] = useState("10");
  const [variantSkuInput, setVariantSkuInput] = useState("");
  const [variantPriceInput, setVariantPriceInput] = useState("");

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

  const handleAddVariant = () => {
    if (!variantLabelInput.trim()) {
      toast.error("Please enter a variant label (e.g. -1.50 or Coral Rose)");
      return;
    }
    const qty = Math.max(0, parseInt(variantQtyInput, 10) || 0);
    const priceOver = variantPriceInput.trim() ? Number(variantPriceInput) : undefined;
    const newVariant: ProductVariant = {
      id: generateId("var"),
      label: variantLabelInput.trim(),
      lensPower: isContactLens ? variantLabelInput.trim() : undefined,
      color: !isContactLens ? variantLabelInput.trim() : undefined,
      quantity: qty,
      skuSuffix: variantSkuInput.trim() || undefined,
      priceOverride: priceOver,
    };
    const nextVariants = [...variants, newVariant];
    setVariants(nextVariants);
    setVariantLabelInput("");
    setVariantSkuInput("");
    setVariantPriceInput("");
    setVariantQtyInput("10");

    // Auto-update total stock to sum of variants
    const totalQty = nextVariants.reduce((sum, v) => sum + v.quantity, 0);
    setStock(String(totalQty));
    toast.success(`Added variant "${newVariant.label}"`);
  };

  const handleRemoveVariant = (variantId: string) => {
    const nextVariants = variants.filter((v) => v.id !== variantId);
    setVariants(nextVariants);
    if (nextVariants.length > 0) {
      const totalQty = nextVariants.reduce((sum, v) => sum + v.quantity, 0);
      setStock(String(totalQty));
    }
  };

  const handleUpdateVariantQty = (variantId: string, newQtyStr: string) => {
    const newQty = Math.max(0, parseInt(newQtyStr, 10) || 0);
    const nextVariants = variants.map((v) =>
      v.id === variantId ? { ...v, quantity: newQty } : v
    );
    setVariants(nextVariants);
    const totalQty = nextVariants.reduce((sum, v) => sum + v.quantity, 0);
    setStock(String(totalQty));
  };

  const handleLoadLensPresets = () => {
    const presetVariants = createContactLensPresets(10);
    setVariants(presetVariants);
    const totalQty = presetVariants.reduce((sum, v) => sum + v.quantity, 0);
    setStock(String(totalQty));
    toast.success(`Loaded 13 standard contact lens prescription powers`);
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
      regularPrice,
      salePrice: salePrice.trim() ? salePrice : undefined,
      images: images.length > 0 ? images : [DEFAULT_PLACEHOLDER_IMG],
      stock,
      lowStockThreshold,
      status,
      isContactLens,
      variants,
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
      toast.success(`Created "${payload.name}" with ${variants.length} variants`);
    } else if (initialProduct) {
      updateProduct(initialProduct.id, payload);
      toast.success(`Saved changes to "${payload.name}" (${variants.length} variants preserved)`);
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

              {/* Contact Lens Classification Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#F0E1E6] bg-[#FDF6F8]/60 mt-3">
                <div className="space-y-0.5">
                  <Label htmlFor="contact-lens-switch" className="text-sm font-semibold text-[#33272C] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D96B91]" />
                    Contact Lens Product
                  </Label>
                  <p className="text-xs text-[#806B73]">
                    Enables prescription diopter power management and optical specifications
                  </p>
                </div>
                <Switch
                  id="contact-lens-switch"
                  checked={isContactLens}
                  onCheckedChange={(checked) => {
                    setIsContactLens(checked);
                    if (checked && categoryId !== "cat-lenses") {
                      setCategoryId("cat-lenses");
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Variants (Shades & Diopter Powers) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Layers className="h-4 w-4 text-[#D96B91]" />
                    Product Variants ({variants.length})
                  </CardTitle>
                  <CardDescription>
                    Manage shade options, sizes, or prescription powers. Stock automatically sums up variants.
                  </CardDescription>
                </div>
                {isContactLens && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadLensPresets}
                    className="text-xs border-[#F0E1E6] text-[#33272C] hover:bg-[#FCEEF2] hover:text-[#D96B91]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#D96B91] mr-1.5" />
                    Load Power Presets
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Add Variant Inputs */}
              <div className="p-3.5 rounded-2xl border border-[#F0E1E6] bg-[#FDF6F8] space-y-3">
                <p className="text-xs font-semibold text-[#33272C]">Add New Variant</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-[#806B73]">Label / Power *</Label>
                    <Input
                      placeholder={isContactLens ? "e.g. -2.50" : "e.g. 01 Velvet Berry"}
                      value={variantLabelInput}
                      onChange={(e) => setVariantLabelInput(e.target.value)}
                      className="h-9 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-[#806B73]">SKU Suffix</Label>
                    <Input
                      placeholder="e.g. 250 or VB01"
                      value={variantSkuInput}
                      onChange={(e) => setVariantSkuInput(e.target.value)}
                      className="h-9 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-[#806B73]">Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={variantQtyInput}
                      onChange={(e) => setVariantQtyInput(e.target.value)}
                      className="h-9 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-[#806B73]">Price Override (MMK)</Label>
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Optional"
                        value={variantPriceInput}
                        onChange={(e) => setVariantPriceInput(e.target.value)}
                        className="h-9 text-xs bg-white"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddVariant}
                        className="h-9 px-3 bg-[#D96B91] hover:bg-[#c2567c] text-white shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant List Table */}
              {variants.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-[#F0E1E6] rounded-2xl">
                  <Layers className="h-6 w-6 text-[#806B73]/60 mx-auto mb-1.5" />
                  <p className="text-xs text-[#806B73]">
                    No variants added. This product uses a single standard inventory count.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#F0E1E6] overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#FAF7F8] border-b border-[#F0E1E6] text-[#806B73] sticky top-0">
                        <tr>
                          <th className="py-2 px-3 font-medium">Variant Label</th>
                          <th className="py-2 px-3 font-medium">SKU Suffix</th>
                          <th className="py-2 px-3 font-medium">Quantity</th>
                          <th className="py-2 px-3 font-medium">Price Override</th>
                          <th className="py-2 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0E1E6]/60">
                        {variants.map((v) => (
                          <tr key={v.id} className="hover:bg-[#FDF6F8]/60 transition-colors">
                            <td className="py-2 px-3 font-semibold text-[#33272C]">
                              {v.label}
                            </td>
                            <td className="py-2 px-3 font-mono text-[#806B73]">
                              {v.skuSuffix || "—"}
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min={0}
                                value={v.quantity}
                                onChange={(e) => handleUpdateVariantQty(v.id, e.target.value)}
                                className="h-7 w-20 text-xs py-0 px-2"
                              />
                            </td>
                            <td className="py-2 px-3 text-[#33272C]">
                              {v.priceOverride ? `${v.priceOverride.toLocaleString()} MMK` : "Base price"}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveVariant(v.id)}
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                aria-label={`Remove variant ${v.label}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-[#FAF7F8] p-2.5 px-3 border-t border-[#F0E1E6] flex items-center justify-between text-xs">
                    <span className="text-[#806B73]">Total Variant Units:</span>
                    <span className="font-semibold text-[#33272C]">
                      {variants.reduce((sum, v) => sum + v.quantity, 0)} units
                    </span>
                  </div>
                </div>
              )}
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

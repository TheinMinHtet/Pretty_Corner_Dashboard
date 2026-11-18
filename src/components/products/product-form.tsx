"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Eye,
  Save,
  X,
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
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialProduct?.variants ?? []
  );
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

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: generateId("var"),
        label: isContactLens ? "Natural Brown / 0.00" : "Standard",
        color: isContactLens ? "Natural Brown" : "",
        lensPower: isContactLens ? "0.00" : "",
        quantity: 10,
        skuSuffix: `V${prev.length + 1}`,
      },
    ]);
  };

  const updateVariant = (
    id: string,
    field: keyof ProductVariant,
    value: string | number
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const next = { ...v, [field]: value };
        if (isContactLens && (field === "color" || field === "lensPower")) {
          const c = field === "color" ? String(value) : v.color ?? "";
          const p = field === "lensPower" ? String(value) : v.lensPower ?? "";
          if (c || p) {
            next.label = [c, p].filter(Boolean).join(" / ");
          }
        }
        return next;
      })
    );
  };

  const removeVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
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

    const totalVariantStock =
      variants.length > 0
        ? variants.reduce((sum, v) => sum + Math.max(0, Number(v.quantity)), 0)
        : Number(stock);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      brand: brand.trim() || "Pretty Corner",
      sku: sku.trim().toUpperCase(),
      regularPrice: Number(regularPrice),
      salePrice: salePrice.trim() ? Number(salePrice) : undefined,
      images: images.length > 0 ? images : [DEFAULT_PLACEHOLDER_IMG],
      stock: variants.length > 0 ? totalVariantStock : Number(stock),
      lowStockThreshold: Math.max(0, Number(lowStockThreshold) || 10),
      status,
      isContactLens,
      variants,
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

          {/* Variants & Contact Lens Attributes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#D96B91]" />
                  Product Variants
                </CardTitle>
                <CardDescription>
                  Manage shades, sizes, or contact lens power options
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="lens-mode" className="text-xs text-[#806B73]">
                  Contact Lens Attributes
                </Label>
                <Switch
                  id="lens-mode"
                  checked={isContactLens}
                  onCheckedChange={setIsContactLens}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {variants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#F0E1E6] p-6 text-center">
                  <p className="text-xs text-[#806B73]">
                    No variants added yet. Add variants for shades, sizes, or lens powers.
                  </p>
                  <Button
                    type="button"
                    variant="primarySoft"
                    size="sm"
                    onClick={addVariant}
                    className="mt-3"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Variant
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end rounded-xl border border-[#F0E1E6] bg-[#FDF6F8]/60 p-3"
                    >
                      {isContactLens ? (
                        <>
                          <div className="sm:col-span-4 space-y-1">
                            <Label className="text-[11px]">Color</Label>
                            <Input
                              value={v.color ?? ""}
                              onChange={(e) =>
                                updateVariant(v.id, "color", e.target.value)
                              }
                              placeholder="e.g., Scandi Olive"
                            />
                          </div>
                          <div className="sm:col-span-3 space-y-1">
                            <Label className="text-[11px]">Lens Power</Label>
                            <Input
                              value={v.lensPower ?? ""}
                              onChange={(e) =>
                                updateVariant(v.id, "lensPower", e.target.value)
                              }
                              placeholder="e.g., -1.50 or 0.00"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="sm:col-span-7 space-y-1">
                          <Label className="text-[11px]">Variant Label</Label>
                          <Input
                            value={v.label}
                            onChange={(e) =>
                              updateVariant(v.id, "label", e.target.value)
                            }
                            placeholder="e.g., #25 Bare Grape or 250ml"
                          />
                        </div>
                      )}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px]">Quantity</Label>
                        <Input
                          type="number"
                          min={0}
                          value={v.quantity}
                          onChange={(e) =>
                            updateVariant(
                              v.id,
                              "quantity",
                              Math.max(0, Number(e.target.value))
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px]">SKU Suffix</Label>
                        <Input
                          value={v.skuSuffix ?? ""}
                          onChange={(e) =>
                            updateVariant(v.id, "skuSuffix", e.target.value)
                          }
                          placeholder="OL-150"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(v.id)}
                          aria-label="Remove variant"
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariant}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another Variant
                  </Button>
                </div>
              )}
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
                <Label htmlFor="stock">
                  Stock Quantity{" "}
                  {variants.length > 0 && "(auto-summed from variants)"}
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  disabled={variants.length > 0}
                  value={
                    variants.length > 0
                      ? variants.reduce((s, v) => s + Number(v.quantity || 0), 0)
                      : stock
                  }
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

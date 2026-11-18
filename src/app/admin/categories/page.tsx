"use client";

import React, { useState } from "react";
import { Plus, Pencil, Trash2, Upload, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { Category } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const DEFAULT_CAT_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="20" fill="#FCEEF2"/><text x="80" y="88" text-anchor="middle" font-size="36">🌸</text></svg>`
  );

export default function CategoriesPage() {
  const { categories, products, addCategory, updateCategory, deleteCategory } =
    useAdminStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(DEFAULT_CAT_IMG);
  const [active, setActive] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setImage(DEFAULT_CAT_IMG);
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description);
    setImage(cat.image);
    setActive(cat.active);
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (editing) {
      updateCategory(editing.id, {
        name: name.trim(),
        slug,
        description: description.trim(),
        image,
        active,
      });
      toast.success(`Updated category "${name.trim()}"`);
    } else {
      addCategory({
        name: name.trim(),
        slug,
        description: description.trim(),
        image,
        active,
      });
      toast.success(`Created category "${name.trim()}"`);
    }
    setDialogOpen(false);
  };

  const getProductCount = (catId: string) =>
    products.filter((p) => p.categoryId === catId).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            Categories
          </h2>
          <p className="text-sm text-[#806B73]">
            Organize Pretty Corner beauty collections and product departments.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const count = getProductCount(cat.id);
          return (
            <Card key={cat.id} className="overflow-hidden">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-16 w-16 rounded-xl border border-[#F0E1E6] object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-[#33272C] truncate">
                        {cat.name}
                      </h3>
                      <Badge variant={cat.active ? "success" : "secondary"}>
                        {cat.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#806B73] mt-1 line-clamp-2">
                      {cat.description || "No description provided."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#F0E1E6] pt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#806B73]">
                    <FolderTree className="h-3.5 w-3.5 text-[#D96B91]" />
                    {count} {count === 1 ? "product" : "products"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={cat.active}
                      onCheckedChange={(checked) => {
                        updateCategory(cat.id, { active: checked });
                        toast.success(
                          `${cat.name} ${checked ? "activated" : "deactivated"}`
                        );
                      }}
                      aria-label={`Toggle ${cat.name} active`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(cat)}
                      aria-label="Edit category"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(cat)}
                      aria-label="Delete category"
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              Configure category name, image preview, and visibility status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={image}
                alt="Category preview"
                className="h-16 w-16 rounded-xl border border-[#F0E1E6] object-cover shrink-0"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#F0E1E6] bg-[#FDF6F8] px-3 py-2 text-xs font-medium text-[#33272C] hover:bg-[#FCEEF2]">
                <Upload className="h-3.5 w-3.5 text-[#D96B91]" />
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Contact Lenses"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this beauty category..."
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#F0E1E6] p-3">
              <div>
                <p className="text-xs font-semibold text-[#33272C]">
                  Active Status
                </p>
                <p className="text-[11px] text-[#806B73]">
                  Visible in catalog organization
                </p>
              </div>
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
                {editing ? "Save Category" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#33272C]">
                {deleteTarget?.name}
              </span>
              ? Products in this category will remain in your catalog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteCategory(deleteTarget.id);
                  toast.success(`Deleted "${deleteTarget.name}"`);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

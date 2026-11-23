"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FolderTree, Loader2 } from "lucide-react";
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
import { PaginationControl } from "@/components/ui/pagination";

type CategoryWithCount = Category & { productCount?: number };

export default function CategoriesPage() {
  const { addCategory, updateCategory, deleteCategory } = useAdminStore();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      const res = await fetch(`/api/categories?${sp.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on page change
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description);
    setActive(cat.active);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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
        active,
      });
      toast.success(`Updated category "${name.trim()}"`);
    } else {
      addCategory({
        name: name.trim(),
        slug,
        description: description.trim(),
        active,
      });
      toast.success(`Created category "${name.trim()}"`);
    }
    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteCategory(deleteTarget.id);
      toast.success(`Deleted category "${deleteTarget.name}"`);
      setDeleteTarget(null);
      fetchCategories();
    }
  };

  const deleteCount = deleteTarget?.productCount ?? 0;

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

      {isLoading && categories.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-2 text-[#806B73]">
            <Loader2 className="h-6 w-6 animate-spin text-[#D96B91]" />
            <span className="text-xs">Fetching categories...</span>
          </div>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="p-12 text-center text-[#806B73]">
          <p className="text-sm font-medium text-[#33272C]">
            No categories found
          </p>
          <p className="text-xs mt-1">
            Click &quot;Add Category&quot; to start organizing your catalog.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const count = cat.productCount ?? 0;
              return (
                <Card key={cat.id} className="overflow-hidden">
                  <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        aria-hidden="true"
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#F0E1E6] bg-[#FCEEF2] font-serif text-2xl font-semibold text-[#B73D67]"
                      >
                        {cat.name.trim().charAt(0).toUpperCase() || "?"}
                      </div>
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
                            setCategories((prev) =>
                              prev.map((c) =>
                                c.id === cat.id ? { ...c, active: checked } : c
                              )
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
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Categories Pagination (Max 10 per page, server-fetched) */}
          <Card>
            <CardContent className="p-0">
              <PaginationControl
                page={page}
                totalPages={totalPages}
                totalItems={total}
                limit={10}
                isLoading={isLoading}
                onPageChange={setPage}
                itemLabel="categories"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update category details and storefront visibility."
                : "Create a new product department for catalog organization."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Facial Cleansers"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of products in this collection..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#F0E1E6] p-3">
              <div className="space-y-0.5">
                <Label htmlFor="cat-active">Active on Storefront</Label>
                <p className="text-xs text-[#806B73]">
                  Inactive categories are hidden from the customer navigation menu.
                </p>
              </div>
              <Switch
                id="cat-active"
                checked={active}
                onCheckedChange={setActive}
              />
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
                {editing ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
              ?
              {deleteCount > 0 && (
                <span className="block mt-2 text-rose-600 font-medium">
                  Warning: {deleteCount} product(s) currently belong to this
                  category. They will be marked as uncategorized.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

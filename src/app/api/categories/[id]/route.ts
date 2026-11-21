import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { formatZodError, UpdateCategorySchema } from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const repo = getStoreRepository();
    const updated = await repo.updateCategory(id, parsed.data);
    if (!updated) {
      return jsonWithCors({ error: "Category not found" }, { status: 404 });
    }
    return jsonWithCors({ category: updated });
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const repo = getStoreRepository();
    const deleted = await repo.deleteCategory(id);
    if (!deleted) {
      return jsonWithCors({ error: "Category not found" }, { status: 404 });
    }
    return jsonWithCors({ ok: true, id });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

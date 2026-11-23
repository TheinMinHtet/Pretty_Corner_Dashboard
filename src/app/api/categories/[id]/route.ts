import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { formatZodError, UpdateCategorySchema } from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaffSession(request);
    if (!staff) {
      return jsonWithCors(
        { error: "Unauthorized: Staff authentication required" },
        { status: 401 },
        undefined,
        request
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 },
        undefined,
        request
      );
    }
    const repo = getStoreRepository();
    const updated = await repo.updateCategory(id, parsed.data);
    if (!updated) {
      return jsonWithCors({ error: "Category not found" }, { status: 404 }, undefined, request);
    }
    return jsonWithCors({ category: updated }, undefined, undefined, request);
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to update category" },
      { status: 500 },
      undefined,
      request
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaffSession(request);
    if (!staff) {
      return jsonWithCors(
        { error: "Unauthorized: Staff authentication required" },
        { status: 401 },
        undefined,
        request
      );
    }

    const { id } = await context.params;
    const repo = getStoreRepository();
    const deleted = await repo.deleteCategory(id);
    if (!deleted) {
      return jsonWithCors({ error: "Category not found" }, { status: 404 }, undefined, request);
    }
    return jsonWithCors({ ok: true, id }, undefined, undefined, request);
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to delete category" },
      { status: 500 },
      undefined,
      request
    );
  }
}

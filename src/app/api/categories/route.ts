import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { CreateCategorySchema, formatZodError } from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const q = searchParams.get("q") ?? undefined;

    if (all || (!pageParam && !limitParam)) {
      const categories = await repo.listCategories();
      return jsonWithCors({ categories }, undefined, undefined, request);
    }

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = limitParam ? Math.min(10, Math.max(1, parseInt(limitParam, 10) || 10)) : 10;

    const result = await repo.listCategoriesPaginated({ page, limit, q });
    return jsonWithCors({
      categories: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    }, undefined, undefined, request);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return jsonWithCors(
      { error: "Failed to load categories" },
      { status: 500 },
      undefined,
      request
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 },
        undefined,
        request
      );
    }

    const repo = getStoreRepository();
    const created = await repo.createCategory(parsed.data);
    return jsonWithCors({ category: created }, { status: 201 }, undefined, request);
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return jsonWithCors(
      { error: "Failed to create category" },
      { status: 500 },
      undefined,
      request
    );
  }
}

import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { CreateCategorySchema, formatZodError } from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
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
      return jsonWithCors({ categories });
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
    });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return jsonWithCors(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const repo = getStoreRepository();
    const category = await repo.createCategory(parsed.data);
    return jsonWithCors({ category }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return jsonWithCors(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

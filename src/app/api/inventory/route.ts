import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const stock = (searchParams.get("stock") as "all" | "in" | "low" | "out") || undefined;
    const q = searchParams.get("q") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const result = await repo.listProductsPaginated({
      page,
      limit,
      stock,
      q,
      category,
    });

    return jsonWithCors({
      products: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      stats: result.stats,
    });
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return jsonWithCors({ error: "Failed to load inventory" }, { status: 500 });
  }
}

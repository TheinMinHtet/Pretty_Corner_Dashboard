import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { CreateProductSchema, formatZodError } from "@/lib/dev-store/schemas";
import { toStorefrontProduct } from "@/lib/dev-store/mappers";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    if (view === "index") {
      const products = await repo.listProducts();
      return jsonWithCors({
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          categoryId: p.categoryId,
        })),
      });
    }

    const audience = searchParams.get("audience");
    const category = searchParams.get("category") ?? undefined;
    const status =
      searchParams.get("status") ??
      (audience === "storefront" ? "Active" : undefined);
    const q = searchParams.get("q") ?? undefined;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    if (pageParam !== null || limitParam !== null || audience !== "storefront") {
      const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
      const limit = limitParam ? Math.min(10, Math.max(1, parseInt(limitParam, 10) || 10)) : 10;
      const stock = (searchParams.get("stock") as "all" | "in" | "low" | "out" | "alert") || undefined;
      const merchandising = (searchParams.get("merchandising") as "all" | "new" | "bestseller" | "promo" | "lowstock") || undefined;
      const sortKey = (searchParams.get("sortKey") as "name" | "price" | "stock" | "createdAt" | "soldCount" | null) || undefined;
      const sortDir = (searchParams.get("sortDir") as "asc" | "desc" | null) || undefined;

      const [paginated, categories] = await Promise.all([
        repo.listProductsPaginated({
          page,
          limit,
          category,
          status,
          stock,
          merchandising,
          q,
          sortKey,
          sortDir,
        }),
        repo.listCategories(),
      ]);

      return jsonWithCors({
        products: paginated.items,
        total: paginated.total,
        page: paginated.page,
        limit: paginated.limit,
        totalPages: paginated.totalPages,
        stats: paginated.stats,
        categories,
      });
    }

    const [products, categories] = await Promise.all([
      repo.listProducts({ category, status, q }),
      repo.listCategories(),
    ]);

    if (audience === "storefront") {
      return jsonWithCors({
        products: products.map((p) => toStorefrontProduct(p, categories)),
      });
    }

    return jsonWithCors({ products, categories });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return jsonWithCors(
      { error: "Failed to load products" },
      { status: 500 }
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
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const repo = getStoreRepository();
    const created = await repo.createProduct(parsed.data);
    return jsonWithCors({ product: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return jsonWithCors(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

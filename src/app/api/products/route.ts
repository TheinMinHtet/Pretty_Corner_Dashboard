import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { CreateProductSchema, formatZodError } from "@/lib/dev-store/schemas";
import { toStorefrontProduct } from "@/lib/dev-store/mappers";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");
    const category = searchParams.get("category") ?? undefined;
    const status =
      searchParams.get("status") ??
      (audience === "storefront" ? "Active" : undefined);
    const q = searchParams.get("q") ?? undefined;

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

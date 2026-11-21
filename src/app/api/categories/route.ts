import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { CreateCategorySchema, formatZodError } from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET() {
  try {
    const repo = getStoreRepository();
    const categories = await repo.listCategories();
    return jsonWithCors({ categories });
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

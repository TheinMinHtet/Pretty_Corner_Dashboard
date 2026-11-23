import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { formatZodError, UpdateProductSchema } from "@/lib/dev-store/schemas";
import { toStorefrontProduct } from "@/lib/dev-store/mappers";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");
    const repo = getStoreRepository();

    const [product, categories] = await Promise.all([
      repo.getProduct(id),
      repo.listCategories(),
    ]);

    if (!product || (audience === "storefront" && product.status !== "Active")) {
      return jsonWithCors({ error: "Product not found" }, { status: 404 });
    }

    if (audience === "storefront") {
      return jsonWithCors({
        product: toStorefrontProduct(product, categories),
      });
    }

    return jsonWithCors({ product });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to load product" },
      { status: 500 }
    );
  }
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
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const repo = getStoreRepository();
    const updated = await repo.updateProduct(id, parsed.data);
    if (!updated) {
      return jsonWithCors({ error: "Product not found" }, { status: 404 });
    }

    return jsonWithCors({ product: updated });
  } catch (error) {
    console.error("PATCH /api/products/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to update product" },
      { status: 500 }
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
    const deleted = await repo.deleteProduct(id);
    if (!deleted) {
      return jsonWithCors({ error: "Product not found" }, { status: 404 });
    }
    return jsonWithCors({ ok: true, id });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

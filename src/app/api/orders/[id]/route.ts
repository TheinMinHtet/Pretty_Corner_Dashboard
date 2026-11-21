import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { formatZodError, UpdateOrderSchema } from "@/lib/dev-store/schemas";
import { toStorefrontOrder } from "@/lib/dev-store/mappers";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
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
    const order = await repo.getOrder(id);

    if (!order) {
      return jsonWithCors({ error: "Order not found" }, { status: 404 });
    }

    if (audience === "storefront") {
      return jsonWithCors({ order: toStorefrontOrder(order) });
    }

    return jsonWithCors({ order });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return jsonWithCors({ error: "Failed to load order" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const repo = getStoreRepository();
    const updated = await repo.updateOrder(id, parsed.data);
    if (!updated) {
      return jsonWithCors({ error: "Order not found" }, { status: 404 });
    }

    return jsonWithCors({
      order: updated,
      storefrontOrder: toStorefrontOrder(updated),
    });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

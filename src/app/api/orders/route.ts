import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import {
  CreateStorefrontOrderSchema,
  formatZodError,
} from "@/lib/dev-store/schemas";
import { toStorefrontOrder } from "@/lib/dev-store/mappers";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");
    const orders = await repo.listOrders();

    if (audience === "storefront") {
      return jsonWithCors({
        orders: orders.map(toStorefrontOrder),
      });
    }

    return jsonWithCors({ orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return jsonWithCors({ error: "Failed to load orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateStorefrontOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const repo = getStoreRepository();
    const created = await repo.createStorefrontOrder(parsed.data);
    return jsonWithCors(
      {
        order: toStorefrontOrder(created),
        adminOrder: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return jsonWithCors(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

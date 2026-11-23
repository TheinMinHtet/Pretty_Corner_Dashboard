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
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    if (audience === "storefront") {
      const orders = await repo.listOrders();
      return jsonWithCors({
        orders: orders.map(toStorefrontOrder),
      });
    }

    if (pageParam !== null || limitParam !== null) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(limitParam || "10", 10) || 10));
      const q = searchParams.get("q") ?? undefined;
      const unifiedStatus = searchParams.get("unifiedStatus") ?? undefined;
      const township = searchParams.get("township") ?? undefined;
      const dateFilter = searchParams.get("dateFilter") ?? undefined;
      const deliveryMethod = (searchParams.get("deliveryMethod") as "all" | "courier" | "pickup") ?? undefined;
      const highValueOnly = searchParams.get("highValueOnly") === "true";
      const sortField =
        (searchParams.get("sortField") as "createdAt" | "total" | "reference") ??
        "createdAt";
      const sortDir = (searchParams.get("sortDir") as "asc" | "desc") ?? "desc";

      const paginated = await repo.listOrdersPaginated({
        page,
        limit,
        q,
        unifiedStatus,
        township,
        dateFilter,
        deliveryMethod,
        highValueOnly,
        sortField,
        sortDir,
      });

      return jsonWithCors({
        orders: paginated.items,
        total: paginated.total,
        page: paginated.page,
        limit: paginated.limit,
        totalPages: paginated.totalPages,
        allTownships: paginated.allTownships,
      });
    }

    const orders = await repo.listOrders();
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

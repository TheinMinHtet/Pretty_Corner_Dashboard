import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { formatZodError, UpdateOrderSchema } from "@/lib/dev-store/schemas";
import { toStorefrontOrder } from "@/lib/dev-store/mappers";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";
import { normalizePhoneNumber } from "@/modules/customers/customer-dossier";

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
    const order = await repo.getOrder(id);

    if (!order) {
      return jsonWithCors({ error: "Order not found" }, { status: 404 }, undefined, request);
    }

    const staff = await verifyStaffSession(request);

    // 1. Staff session allows full administrative access (or sanitized storefront view if requested)
    if (staff) {
      if (audience === "storefront") {
        return jsonWithCors({ order: toStorefrontOrder(order) }, undefined, undefined, request);
      }
      return jsonWithCors({ order }, undefined, undefined, request);
    }

    // 2. Unauthenticated storefront lookup requires matching phone verification
    if (audience === "storefront") {
      const phone = searchParams.get("phone");
      const cleanDigits = phone ? phone.trim().replace(/[^0-9]/g, "") : "";
      if (cleanDigits.length >= 8) {
        if (normalizePhoneNumber(phone!) === normalizePhoneNumber(order.customerPhone)) {
          return jsonWithCors({ order: toStorefrontOrder(order) }, undefined, undefined, request);
        }
      }
    }

    return jsonWithCors(
      { error: "Unauthorized: Staff authentication or matching phone number required" },
      { status: 401 },
      undefined,
      request
    );
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return jsonWithCors({ error: "Failed to load order" }, { status: 500 }, undefined, request);
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
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const repo = getStoreRepository();
    const mutation = await repo.updateOrder(id, parsed.data);
    if (!mutation) {
      return jsonWithCors({ error: "Order not found" }, { status: 404 });
    }

    return jsonWithCors({
      order: mutation.updatedOrder,
      storefrontOrder: toStorefrontOrder(mutation.updatedOrder),
      mutation,
    });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    return jsonWithCors(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

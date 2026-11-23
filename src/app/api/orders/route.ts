import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import {
  CreateStorefrontOrderSchema,
  formatZodError,
} from "@/lib/dev-store/schemas";
import { toStorefrontOrder } from "@/lib/dev-store/mappers";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { verifyStaffSession } from "@/lib/security/auth-guard";
import { normalizePhoneNumber } from "@/modules/customers/customer-dossier";
import { evaluateOrderPromotion } from "@/modules/orders/order-lifecycle";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");
    const staff = await verifyStaffSession(request);

    // 1. If caller has an active staff session, permit full administrative queries
    if (staff) {
      const pageParam = searchParams.get("page");
      const limitParam = searchParams.get("limit");

      if (audience === "storefront") {
        const orders = await repo.listOrders();
        return jsonWithCors({
          orders: orders.map(toStorefrontOrder),
        }, undefined, undefined, request);
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
        }, undefined, undefined, request);
      }

      const orders = await repo.listOrders();
      return jsonWithCors({ orders }, undefined, undefined, request);
    }

    // 2. Unauthenticated storefront callers must provide a matching verified phone number
    if (audience === "storefront") {
      const phone = searchParams.get("phone");
      const cleanDigits = phone ? phone.trim().replace(/[^0-9]/g, "") : "";
      if (cleanDigits.length >= 8) {
        const normalizedTarget = normalizePhoneNumber(phone!);
        const orders = await repo.listOrders();
        const customerOrders = orders
          .filter((o) => normalizePhoneNumber(o.customerPhone) === normalizedTarget)
          .map(toStorefrontOrder);

        return jsonWithCors({ orders: customerOrders }, undefined, undefined, request);
      }
    }

    // 3. Reject all other unauthenticated requests to prevent PII harvesting
    return jsonWithCors(
      { error: "Unauthorized: Staff authentication required" },
      { status: 401 },
      undefined,
      request
    );
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return jsonWithCors({ error: "Failed to load orders" }, { status: 500 }, undefined, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Sliding window rate limit (30 orders / min per IP)
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`order:${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 30,
    });

    if (!rateCheck.success) {
      return jsonWithCors(
        { error: "Too many order requests. Please slow down." },
        { status: 429 },
        undefined,
        request
      );
    }

    const body = await request.json();
    const parsed = CreateStorefrontOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 },
        undefined,
        request
      );
    }

    const repo = getStoreRepository();
    const catalogProducts = await repo.listProducts();

    // 2. Line item inventory check & authoritative price recalculation
    let authoritativeSubtotal = 0;
    for (const item of parsed.data.items) {
      const matched = catalogProducts.find(
        (p) =>
          p.id === item.productId ||
          p.slug === item.productId ||
          p.name.toLowerCase() === item.name.toLowerCase()
      );
      if (matched && item.quantity > matched.stock) {
        return jsonWithCors(
          {
            error: `Requested quantity for "${matched.name}" (${item.quantity}) exceeds available stock (${matched.stock} available)`,
          },
          { status: 409 },
          undefined,
          request
        );
      }
    }

    const verifiedItems = parsed.data.items.map((item) => {
      // Find matching catalog item by ID, slug, or name
      const matched = catalogProducts.find(
        (p) =>
          p.id === item.productId ||
          p.slug === item.productId ||
          p.name.toLowerCase() === item.name.toLowerCase()
      );

      // Use active catalog price (salePrice if available, else regularPrice)
      let verifiedUnitPrice = item.price;
      if (matched) {
        verifiedUnitPrice =
          matched.salePrice !== undefined && matched.salePrice > 0
            ? matched.salePrice
            : matched.regularPrice;
      }

      const itemTotal = verifiedUnitPrice * item.quantity;
      authoritativeSubtotal += itemTotal;

      return {
        ...item,
        price: verifiedUnitPrice,
      };
    });

    const deliveryFee = Math.max(0, parsed.data.deliveryFee || 0);

    // 3. Server-Authoritative Promotion & Discount Calculation
    const promotions = await repo.listPromotions().catch(() => []);
    const promoEval = evaluateOrderPromotion(
      parsed.data.promoCode,
      promotions,
      verifiedItems,
      authoritativeSubtotal,
      catalogProducts
    );

    if (parsed.data.promoCode && !promoEval.valid) {
      return jsonWithCors(
        { error: promoEval.reason || "Invalid promotion code" },
        { status: 400 },
        undefined,
        request
      );
    }

    const verifiedDiscount = promoEval.discountAmount;
    const appliedPromotionId = promoEval.promoId;

    const authoritativeTotal = Math.max(
      0,
      authoritativeSubtotal + deliveryFee - verifiedDiscount
    );

    // 4. Security Guard: Disallow client from marking unverified new orders as "paid"
    // Newly placed orders must start as "pending"
    const enforcedPaymentStatus: "pending" = "pending";

    const verifiedOrderInput = {
      ...parsed.data,
      items: verifiedItems,
      subtotal: authoritativeSubtotal,
      deliveryFee,
      discount: verifiedDiscount,
      discountAmount: verifiedDiscount,
      promoCode: appliedPromotionId ? parsed.data.promoCode?.trim().toUpperCase() : undefined,
      appliedPromotionId,
      total: authoritativeTotal,
      paymentStatus: enforcedPaymentStatus,
    };

    const created = await repo.createStorefrontOrder(verifiedOrderInput);
    return jsonWithCors(
      {
        order: toStorefrontOrder(created),
        adminOrder: created,
      },
      { status: 201 },
      undefined,
      request
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return jsonWithCors(
      { error: "Failed to create order" },
      { status: 500 },
      undefined,
      request
    );
  }
}

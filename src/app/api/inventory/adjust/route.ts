import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import {
  formatZodError,
  StockAdjustmentRequestSchema,
} from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
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
    const parsed = StockAdjustmentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 },
        undefined,
        request
      );
    }

    const repo = getStoreRepository();
    const result = await repo.adjustStock(parsed.data);
    if (!result) {
      return jsonWithCors({ error: "Product not found" }, { status: 404 }, undefined, request);
    }

    return jsonWithCors(result, undefined, undefined, request);
  } catch (error) {
    console.error("POST /api/inventory/adjust error:", error);
    return jsonWithCors(
      { error: "Failed to adjust stock" },
      { status: 500 },
      undefined,
      request
    );
  }
}

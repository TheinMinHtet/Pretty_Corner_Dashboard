import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import {
  formatZodError,
  StockAdjustmentRequestSchema,
} from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = StockAdjustmentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const repo = getStoreRepository();
    const result = await repo.adjustStock(parsed.data);
    if (!result) {
      return jsonWithCors({ error: "Product not found" }, { status: 404 });
    }

    return jsonWithCors(result);
  } catch (error) {
    console.error("POST /api/inventory/adjust error:", error);
    return jsonWithCors(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}

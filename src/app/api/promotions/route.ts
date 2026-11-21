import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import {
  CreatePromotionSchema,
  formatZodError,
} from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET() {
  try {
    const repo = getStoreRepository();
    const data = await repo.getAllData();
    return jsonWithCors({ promotions: data.promotions });
  } catch (error) {
    console.error("GET /api/promotions error:", error);
    return jsonWithCors(
      { error: "Failed to load promotions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreatePromotionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const repo = getStoreRepository();
    const promotion = await repo.createPromotion(parsed.data);
    return jsonWithCors({ promotion }, { status: 201 });
  } catch (error) {
    console.error("POST /api/promotions error:", error);
    return jsonWithCors(
      { error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}

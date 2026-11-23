import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import {
  CreatePromotionSchema,
  formatZodError,
} from "@/lib/dev-store/schemas";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const data = await repo.getAllData();
    return jsonWithCors({ promotions: data.promotions }, undefined, undefined, request);
  } catch (error) {
    console.error("GET /api/promotions error:", error);
    return jsonWithCors(
      { error: "Failed to load promotions" },
      { status: 500 },
      undefined,
      request
    );
  }
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
    const parsed = CreatePromotionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithCors(
        { error: formatZodError(parsed.error) },
        { status: 400 },
        undefined,
        request
      );
    }
    const repo = getStoreRepository();
    const promotion = await repo.createPromotion(parsed.data);
    return jsonWithCors({ promotion }, { status: 201 }, undefined, request);
  } catch (error) {
    console.error("POST /api/promotions error:", error);
    return jsonWithCors(
      { error: "Failed to create promotion" },
      { status: 500 },
      undefined,
      request
    );
  }
}

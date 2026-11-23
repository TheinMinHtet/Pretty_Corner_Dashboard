import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const data = await repo.getAllData();
    return jsonWithCors({ settings: data.settings }, undefined, undefined, request);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return jsonWithCors(
      { error: "Failed to load settings" },
      { status: 500 },
      undefined,
      request
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const repo = getStoreRepository();
    const settings = await repo.updateSettings(body);
    return jsonWithCors({ settings }, undefined, undefined, request);
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return jsonWithCors(
      { error: "Failed to update settings" },
      { status: 500 },
      undefined,
      request
    );
  }
}

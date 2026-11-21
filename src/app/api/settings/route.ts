import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET() {
  try {
    const repo = getStoreRepository();
    const data = await repo.getAllData();
    return jsonWithCors({ settings: data.settings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return jsonWithCors(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const repo = getStoreRepository();
    const settings = await repo.updateSettings(body);
    return jsonWithCors({ settings });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return jsonWithCors(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";

export async function OPTIONS(req: NextRequest) {
  return corsPreflightResponse(req);
}

export async function GET(req: NextRequest) {
  try {
    const staff = await verifyStaffSession(req);
    if (!staff) {
      return jsonWithCors(
        { error: "Unauthorized: Staff authentication required" },
        { status: 401 },
        undefined,
        req
      );
    }

    const repo = getStoreRepository();
    const data = await repo.getBootstrapData();
    return jsonWithCors(data, undefined, undefined, req);
  } catch (error) {
    console.error("GET /api/admin/bootstrap error:", error);
    return jsonWithCors(
      { error: "Failed to bootstrap admin store" },
      { status: 500 },
      undefined,
      req
    );
  }
}

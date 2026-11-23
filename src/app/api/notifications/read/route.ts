import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
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

    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      ids?: string[];
    };
    const repo = getStoreRepository();
    if (body.id) {
      await repo.markNotificationRead(body.id);
    } else {
      const ids = Array.isArray(body.ids)
        ? body.ids.filter((id): id is string => typeof id === "string")
        : undefined;
      await repo.markAllNotificationsRead(ids);
    }
    return jsonWithCors({ ok: true }, undefined, undefined, request);
  } catch (error) {
    console.error("POST /api/notifications/read error:", error);
    return jsonWithCors(
      { error: "Failed to mark notification read" },
      { status: 500 },
      undefined,
      request
    );
  }
}

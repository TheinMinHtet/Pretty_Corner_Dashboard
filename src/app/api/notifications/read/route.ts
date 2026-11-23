import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function POST(request: NextRequest) {
  try {
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
    return jsonWithCors({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/read error:", error);
    return jsonWithCors(
      { error: "Failed to mark notification read" },
      { status: 500 }
    );
  }
}

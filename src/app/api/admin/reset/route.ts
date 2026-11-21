import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function POST() {
  try {
    const repo = getStoreRepository();
    const data = await repo.resetToSeed();
    return jsonWithCors(data);
  } catch (error) {
    console.error("POST /api/admin/reset error:", error);
    return jsonWithCors(
      { error: "Failed to reset store" },
      { status: 500 }
    );
  }
}

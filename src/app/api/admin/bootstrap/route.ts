import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET() {
  try {
    const repo = getStoreRepository();
    const data = await repo.getBootstrapData();
    return jsonWithCors(data);
  } catch (error) {
    console.error("GET /api/admin/bootstrap error:", error);
    return jsonWithCors(
      { error: "Failed to bootstrap admin store" },
      { status: 500 }
    );
  }
}

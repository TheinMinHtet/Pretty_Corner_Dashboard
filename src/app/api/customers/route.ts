import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { getCustomerDossiers } from "@/modules/customers/customer-dossier";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || undefined;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const [orders, customers] = await Promise.all([
      repo.listOrders(),
      repo.listCustomers(),
    ]);

    const dossiers = getCustomerDossiers(orders, customers, { query: q });

    if (!pageParam && !limitParam) {
      return jsonWithCors({ customers: dossiers });
    }

    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.min(10, Math.max(1, parseInt(limitParam || "10", 10) || 10));
    const total = dossiers.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = dossiers.slice((page - 1) * limit, page * limit);

    return jsonWithCors({
      customers: items,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return jsonWithCors(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}

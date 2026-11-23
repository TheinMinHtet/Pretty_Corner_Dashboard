import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import {
  getCustomerDossiers,
  CustomerDossierFilterOptions,
} from "@/modules/customers/customer-dossier";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || undefined;
    const tier = (searchParams.get("tier") as "all" | "vip" | "repeat" | "new") || undefined;
    const township = searchParams.get("township")?.trim() || undefined;
    const sortKey = (searchParams.get("sortKey") as CustomerDossierFilterOptions["sortKey"]) || undefined;
    const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || undefined;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const [orders, customers] = await Promise.all([
      repo.listOrders(),
      repo.listCustomers(),
    ]);

    // Collect all townships from raw orders and customers for filter options
    const townshipSet = new Set<string>();
    for (const o of orders) {
      if (o.township?.trim()) townshipSet.add(o.township.trim());
    }
    for (const c of customers) {
      for (const a of c.addresses || []) {
        if (a.township?.trim()) townshipSet.add(a.township.trim());
      }
    }
    const allTownships = Array.from(townshipSet).sort();

    const dossiers = getCustomerDossiers(orders, customers, {
      query: q,
      tier,
      township: township !== "All" ? township : undefined,
      sortKey,
      sortDir,
    });

    if (!pageParam && !limitParam) {
      return jsonWithCors({ customers: dossiers, allTownships });
    }

    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitParam || "10", 10) || 10));
    const total = dossiers.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = dossiers.slice((page - 1) * limit, page * limit);

    return jsonWithCors({
      customers: items,
      total,
      page,
      limit,
      totalPages,
      allTownships,
    });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return jsonWithCors(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}

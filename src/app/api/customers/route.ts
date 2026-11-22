import { NextRequest } from "next/server";
import { getStoreRepository } from "@/lib/dev-store/repository";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: NextRequest) {
  try {
    const repo = getStoreRepository();
    const customers = await repo.listCustomers();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    if (!q) {
      return jsonWithCors({ customers });
    }

    const filtered = customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      );
    });

    return jsonWithCors({ customers: filtered });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return jsonWithCors(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}

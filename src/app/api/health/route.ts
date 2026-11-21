import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET() {
  return jsonWithCors({
    ok: true,
    mode: "temporary-dev-json-store",
    timestamp: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function jsonWithCors<T>(
  data: T,
  init?: ResponseInit,
  cacheHeader?: string
): NextResponse<T> {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", cacheHeader || "no-store, max-age=0");
  }
  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

export function corsPreflightResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.prettycornershopmm.com",
  "https://prettycornershopmm.com",
  "http://www.prettycornershopmm.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:5173",
];

export function resolveAllowedOrigin(requestOrigin?: string | null): string {
  if (!requestOrigin) return "*";

  // Check if it's any localhost or 127.0.0.1 port (for local dev safety)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
    return requestOrigin;
  }

  // Check explicitly configured origins
  const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const allowed = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];
  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  // In production, if unlisted cross-origin, default to self/null or first allowed origin
  return allowed[0] || "*";
}

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const resolvedOrigin = resolveAllowedOrigin(requestOrigin);
  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export function jsonWithCors<T>(
  data: T,
  init?: ResponseInit,
  cacheHeader?: string,
  request?: Request
): NextResponse<T> {
  const requestOrigin = request ? request.headers.get("origin") : null;
  const corsHeaders = getCorsHeaders(requestOrigin);

  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
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

export function corsPreflightResponse(request?: Request): NextResponse {
  const requestOrigin = request ? request.headers.get("origin") : null;
  const corsHeaders = getCorsHeaders(requestOrigin);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

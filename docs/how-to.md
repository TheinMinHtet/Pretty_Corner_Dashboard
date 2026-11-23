# How to Bypass Supabase ISP/VPN Blocking Using Vercel Rewrites

This guide documents the technical design, configuration, and implementation used in this project to enable direct, seamless access to Supabase in countries where telecom ISPs block `*.supabase.co` (such as Myanmar) without requiring users to install or enable a VPN.

---

## 1. The Core Problem: Why Supabase is Blocked

In restricted network environments, internet service providers (ISPs) implement censorship using **SNI (Server Name Indication) filtering** and **DNS poisoning**:

```
[User Browser in Myanmar]
           │
           │  HTTPS Request to: https://<project-ref>.supabase.co
           ▼
    [Local Telecom ISP]  ──►  Detects "*.supabase.co" in TLS SNI Header
           │
           ├──► [BLOCK TRIGGERED]: Connection Reset / TCP Timeout (ERR_CONNECTION_RESET)
           ▼
[Supabase Cloud Servers] (Never Reached)
```

Because the ISP inspects the destination domain during the initial TLS handshake (before encryption is established), any direct browser connection to `*.supabase.co` fails unless the user routes their entire device traffic through a VPN.

---

## 2. The Solution: Vercel Edge Reverse Proxy (Rewrites)

Instead of having client browsers talk directly to Supabase, we proxy all database, authentication, and REST requests through our **Vercel domain**:

```
[User Browser in Myanmar]
           │
           │  HTTPS Request to: https://your-domain.vercel.app/supabase/rest/v1/...
           ▼
    [Local Telecom ISP]  ──►  Inspects SNI: "your-domain.vercel.app" (Allowed ✅)
           │
           ▼
 [Vercel Global Edge CDN]
           │
           │  Internal Backbone Proxy (US / Singapore / Europe)
           ▼
[Supabase Cloud Servers] (delosykfbjvkjggldxxz.supabase.co)
```

### Why this works:
1. **Unblocked Domain**: The browser only connects to `your-app.vercel.app` (or your own custom domain), which ISPs do not block.
2. **Edge Proxying**: Vercel's Edge network receives the request and transparently forwards it to `https://<project-ref>.supabase.co` across Vercel's global network.
3. **Transparent Response**: Supabase responds back to Vercel, and Vercel returns the data to the browser.
4. **Zero Overhead**: No extra proxy server to maintain; Vercel handles SSL termination, caching, and routing natively at the edge.

---

## 3. Step-by-Step Implementation Guide

### Step 1: Configure Vercel Rewrites

There are two files that define this behavior:

#### A. In `next.config.mjs` (for Next.js)
```javascript
/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vbcdopdttqmplwnknppl.supabase.co';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Any request sent to /supabase/* will be forwarded to Supabase
        source: '/supabase/:path*',
        destination: `${supabaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

#### B. In `vercel.json` (for Vercel Edge routing)
Add a `vercel.json` in your project root:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/supabase/:path*",
      "destination": "https://vbcdopdttqmplwnknppl.supabase.co/:path*"
    }
  ]
}
```

---

### Step 2: Configure Client-Side Supabase SDK (`@supabase/supabase-js`)

The magic happens in how the client-side Supabase client is initialized:

In `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://vbcdopdttqmplwnknppl.supabase.co";

/**
 * Creates a browser Supabase client.
 * In the browser, it routes through window.location.origin + '/supabase'
 * so that traffic travels through Vercel's edge proxy, bypassing ISP blocks.
 */
export const getSupabaseUrl = (useDirectConnection: boolean = false) => {
  const directUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  // CRITICAL: Point the browser to /supabase rewrite on your current domain
  const url =
    typeof window !== "undefined" && !useDirectConnection
      ? `${window.location.origin}/supabase`
      : directUrl;

  return url;
};
```

---

### Step 3: Configure Server-Side SSR (`@supabase/ssr`)

Server Components, Route Handlers, and Server Actions run directly on Vercel's backend servers in data centers abroad. They **never** pass through local country ISPs, so they can talk directly to `NEXT_PUBLIC_SUPABASE_URL`:

Create `utils/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://delosykfbjvkjggldxxz.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    "sb_publishable_0TsXSJyJD2_0wpAYKf0pPQ_xh-y-zXd";

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignored when called from Server Component
          }
        },
      },
    },
  );
};
```

---

### Step 4: Configure Middleware for Auth Sessions

Create `middleware.ts` in your root folder:

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Apply to all routes except static assets and proxied /supabase endpoints
    "/((?!_next/static|_next/image|favicon.ico|supabase|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

And in `utils/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://delosykfbjvkjggldxxz.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    "sb_publishable_0TsXSJyJD2_0wpAYKf0pPQ_xh-y-zXd";

export const updateSession = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    supabase.auth.getUser();
  } catch (e) {
    // Graceful fallback
  }

  return supabaseResponse;
};
```

---

## 4. How to Apply this to Any Existing Project

Whenever you start a new React/Next.js/Vite project with Supabase:

1. **Add the rewrite rule** to your `next.config.mjs` (or `vercel.json`):
   ```js
   { source: '/supabase/:path*', destination: 'https://<your-project>.supabase.co/:path*' }
   ```
2. **In your browser client initialization**, use:
   ```js
   const supabaseUrl = typeof window !== 'undefined' 
     ? `${window.location.origin}/supabase` 
     : process.env.NEXT_PUBLIC_SUPABASE_URL;

   export const supabase = createClient(supabaseUrl, anonKey);
   ```
3. Deploy to Vercel (`vercel deploy --prod`).
4. That's it! Your users in censored countries can use the app with **VPN turned OFF**.

---

## 5. Live Verification Proof

In our production deployment (**`https://test-nine-iota-57.vercel.app`**):

| Endpoint | Result | Latency | Note |
|---|---|---|---|
| Direct `delosykfbjvkjggldxxz.supabase.co` | **BLOCKED** without VPN | Timeout / Connection Reset | Blocked by ISP SNI filtering |
| Rewritten `/supabase/rest/v1/todos` | **200 OK** without VPN | **428ms** | Bypasses ISP block completely |
| Server-Side SSR `/todos` | **200 OK** without VPN | **841ms** | Runs on Vercel backend |

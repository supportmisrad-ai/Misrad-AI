import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isLegacyLoginEntrypointPathname, legacyAppPathnameRedirect, normalizeLegacyRedirectPath } from "@/lib/os/legacy-routing";
import { edgeGlobalRateLimit } from "@/lib/edge-rate-limit";

const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/accessibility(.*)",
  "/contact(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/refund-policy(.*)",
  "/security(.*)",
  "/support(.*)",
  "/login(.*)",
  "/reset-password(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/maintenance(.*)",
  "/trial-expired",
  "/app/trial-expired",
  "/invite/(.*)",
  "/employee-invite/(.*)",
  "/portal/ops/(.*)",
  "/connect/offer/(.*)",
  "/marketplace/offer/(.*)",
  "/sso-callback",
  "/api/integrations/google/callback",
  "/partner-portal(.*)",
  "/pricing(.*)",
  "/checkout(.*)",
  "/subscribe/checkout(.*)",
  "/solo(.*)",
  "/kiosk-login(.*)",
  "/kiosk-scan(.*)",
  "/kiosk-home(.*)",
  "/the-closer(.*)",
  "/the-authority(.*)",
  "/the-operator(.*)",
  "/the-empire(.*)",
  "/client(.*)",
  "/system(.*)",
  "/nexus(.*)",
  "/operations(.*)",
  "/social(.*)",
  "/finance-landing(.*)",
  "/manifest.json",
  "/sw.js",
  "/manifests/(.*)",
  "/api/webhooks/clerk",
  "/api/cron(.*)",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

const BYPASS_CLERK_USER_ID = (process.env.MAINTENANCE_BYPASS_CLERK_USER_ID || "").trim();

const BYPASS_EMAILS = new Set(
  String(process.env.MAINTENANCE_BYPASS_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

const BYPASS_USER_IDS = new Set(
  String(process.env.MAINTENANCE_BYPASS_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const getProp = (obj: unknown, key: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  return (obj as Record<string, unknown>)[key];
};

let cachedMaintenanceMode: { value: boolean; ts: number } | null = null;

async function isMaintenanceModeEnabled(origin: string): Promise<boolean> {
  const now = Date.now();
  if (cachedMaintenanceMode && now - cachedMaintenanceMode.ts < 15_000) {
    return cachedMaintenanceMode.value;
  }

  try {
    const url = new URL("/api/system/maintenance", origin).toString();
    const res = await fetch(url, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);
    const value = Boolean((json as { maintenanceMode?: unknown } | null)?.maintenanceMode);
    cachedMaintenanceMode = { value, ts: now };
    return value;
  } catch {
    cachedMaintenanceMode = { value: false, ts: now };
    return false;
  }
}

function extractEmailFromClaims(claims: unknown): string | null {
  try {
    const candidates = [
      getProp(claims, 'email'),
      getProp(claims, 'email_address'),
      getProp(claims, 'primaryEmailAddress'),
      getProp(claims, 'primary_email_address'),
      getProp(claims, 'primary_email'),
      getProp(getProp(claims, 'user'), 'email'),
      getProp(getProp(claims, 'user'), 'primary_email_address'),
      getProp(getProp(claims, 'user'), 'primaryEmailAddress'),
    ].filter(Boolean);

    for (const c of candidates) {
      const e = String(c || '').trim().toLowerCase();
      if (e.includes('@')) return e;
    }

    const arrCandidates = [
      getProp(claims, 'emailAddresses'),
      getProp(claims, 'email_addresses'),
      getProp(getProp(claims, 'user'), 'emailAddresses'),
      getProp(getProp(claims, 'user'), 'email_addresses'),
    ];

    for (const arr of arrCandidates) {
      if (Array.isArray(arr) && arr.length > 0) {
        for (const item of arr) {
          const emailAddress = getProp(item, 'emailAddress');
          const email_address = getProp(item, 'email_address');
          const e = String(emailAddress ?? email_address ?? item ?? '').trim().toLowerCase();
          if (e.includes('@')) return e;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default clerkMiddleware(async (auth, req) => {
  const pathname = req?.nextUrl?.pathname ?? "";

  // Bypass Clerk entirely for static assets that must always be public
  if (
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/manifests/") ||
    pathname.startsWith("/icons/") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png")
  ) {
    return NextResponse.next();
  }

  const isDev = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

  // Hard block: /api/e2e/* routes are NEVER accessible in production
  if (!isDev && pathname.startsWith('/api/e2e')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Global per-IP rate limiting for all API routes
  if (pathname.startsWith('/api/')) {
    try {
      const rl = await edgeGlobalRateLimit(req);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many requests', retryAfterSeconds: rl.retryAfterSeconds },
          {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfterSeconds) },
          }
        );
      }
    } catch {
      // Rate limiter failure must never block requests — degrade gracefully
    }
  }

  const isE2E =
    String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true' ||
    String(process.env.IS_E2E_TESTING || '').toLowerCase() === '1';
  const allowDevMaintenance =
    String(process.env.ALLOW_DEV_MAINTENANCE || '').toLowerCase() === 'true' ||
    String(process.env.ALLOW_DEV_MAINTENANCE || '').toLowerCase() === '1';

  const clerkSecretKey = String(process.env.CLERK_SECRET_KEY || '').trim();
  const clerkPublishableKey = String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').trim();
  const isClerkConfigured = Boolean(clerkSecretKey && clerkPublishableKey);
  if (!isClerkConfigured) {
    if (!isDev) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }
    return NextResponse.next();
  }
  const configuredSignInUrlRaw = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/login";
  const configuredSignInUrl = configuredSignInUrlRaw.startsWith("/sign-in") ? "/login" : configuredSignInUrlRaw;
  const unauthenticatedUrl = configuredSignInUrl.startsWith("http")
    ? configuredSignInUrl
    : new URL(configuredSignInUrl, req.nextUrl.origin).toString();

  const legacyAppRedirect = legacyAppPathnameRedirect(pathname);
  if (legacyAppRedirect) {
    const url = req?.nextUrl?.clone?.();
    if (!url) return NextResponse.next();
    url.pathname = legacyAppRedirect;
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) {
    const url = req?.nextUrl?.clone?.();
    if (!url) return NextResponse.next();
    url.pathname = "/login";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/sign-up" || pathname.startsWith("/sign-up/")) {
    const url = req?.nextUrl?.clone?.();
    if (!url) return NextResponse.next();
    url.pathname = "/login";
    url.searchParams.set("mode", "sign-up");
    return NextResponse.redirect(url, 308);
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
    if (pathname === "/api/system/maintenance") {
      return NextResponse.next();
    }
    if (isDev && pathname === '/api/debug/middleware') {
      const { userId, sessionClaims: claims } = await auth();
      const cookieHeader = req.headers.get('cookie') || '';
      const cookieNames = cookieHeader
        .split(/;\s*/)
        .map((part) => String(part || '').split('=')[0] || '')
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 100);

      const clerkSecretKey = String(process.env.CLERK_SECRET_KEY || '').trim();
      const publishableKey = String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').trim();

      return NextResponse.json({
        ok: true,
        nodeEnv: process.env.NODE_ENV || null,
        pathname,
        origin: req.nextUrl.origin,
        host: req.headers.get('host') || null,
        hasCookies: cookieHeader.length > 0,
        cookieCount: cookieNames.length,
        cookieNames,
        hasSessionCookie: cookieHeader.includes('__session='),
        hasClerkDbJwt: cookieHeader.includes('__clerk_db_jwt='),
        hasClerkActiveContext: cookieHeader.includes('clerk_active_context='),
        middlewareUserIdPresent: Boolean(userId),
        middlewareHasClaims: claims != null,
        env: {
          publishableKeyPrefix: publishableKey ? publishableKey.slice(0, 8) : null,
          secretKeyPrefix: clerkSecretKey ? clerkSecretKey.slice(0, 8) : null,
          secretKeyLooksValid:
            clerkSecretKey.startsWith('sk_test_') || clerkSecretKey.startsWith('sk_live_'),
        },
      });
    }

     try {
       await auth();
     } catch {
       // Intentionally ignore auth resolution errors for API routes.
     }

    return NextResponse.next();
  }

  const { userId, sessionClaims: claims } = await auth();


  // Legacy entrypoints -> canonical flow via /login redirect param.
  // LoginPageClient will convert these into workspace paths using orgSlug.
  if (isLegacyLoginEntrypointPathname(pathname)) {
    const url = req?.nextUrl?.clone?.();
    if (!url) return NextResponse.next();
    url.pathname = "/login";
    url.searchParams.set("redirect", normalizeLegacyRedirectPath(pathname) || pathname);
    return NextResponse.redirect(url, 308);
  }

  // Normalize login redirect param if it points to legacy paths
  if (pathname === "/login") {
    const redirectParam = req?.nextUrl?.searchParams?.get("redirect");
    const normalized = redirectParam ? normalizeLegacyRedirectPath(redirectParam) : null;
    if (redirectParam && normalized && normalized !== redirectParam) {
      const url = req?.nextUrl?.clone?.();
      if (!url) return NextResponse.next();
      url.searchParams.set("redirect", normalized);
      return NextResponse.redirect(url, 308);
    }
  }

  const maintenanceMode = (isE2E || (isDev && !allowDevMaintenance))
    ? false
    : await isMaintenanceModeEnabled(req.nextUrl.origin);
  const isSuperAdmin = Boolean(
    getProp(getProp(claims, 'publicMetadata'), 'isSuperAdmin') === true ||
      getProp(getProp(claims, 'public_metadata'), 'isSuperAdmin') === true ||
      getProp(getProp(claims, 'public_metadata'), 'is_super_admin') === true ||
      getProp(getProp(claims, 'app_metadata'), 'is_super_admin') === true ||
      getProp(getProp(claims, 'app_metadata'), 'isSuperAdmin') === true
  );

  const sessionEmail = extractEmailFromClaims(claims);
  const isBypassEmail = Boolean(sessionEmail && BYPASS_EMAILS.has(sessionEmail));
  const isBypassUserId = Boolean(userId && BYPASS_USER_IDS.has(userId));
  const isBypassUser = Boolean(BYPASS_CLERK_USER_ID && userId && userId === BYPASS_CLERK_USER_ID);
  const isMaintenanceBypass = isSuperAdmin || isBypassUser || isBypassEmail || isBypassUserId;

  if (maintenanceMode && !isMaintenanceBypass) {
    const isAuthRoute =
      pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/reset-password" ||
      pathname.startsWith("/reset-password/");

    const isStatic =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname === "/manifest.json" ||
      pathname === "/sw.js" ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/manifests/") ||
      pathname.startsWith("/icon-") ||
      pathname.startsWith("/public/");

    if (!isStatic && !isAuthRoute && !pathname.startsWith("/maintenance")) {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.redirect(url, 307);
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl });
  }

  return NextResponse.next();
}, {
  isSatellite: false,
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf|eot|json)).*)", 
    "/", 
    "/(api|trpc)(.*)"
  ],
};

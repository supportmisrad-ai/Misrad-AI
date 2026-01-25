import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/maintenance(.*)",
  "/api/webhooks/clerk",
]);

const BYPASS_CLERK_USER_ID = (process.env.MAINTENANCE_BYPASS_CLERK_USER_ID || "").trim();

const BYPASS_EMAILS = new Set(
  String(process.env.MAINTENANCE_BYPASS_EMAILS || 'itsikdahan1@gmail.com,support@misrad-ai.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

const BYPASS_USER_IDS = new Set(
  String(process.env.MAINTENANCE_BYPASS_USER_IDS || 'user_36taRKpH1VdyycRdg9POOD0trxH')
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
  const configuredSignInUrlRaw = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/login";
  const configuredSignInUrl = configuredSignInUrlRaw.startsWith("/sign-in") ? "/login" : configuredSignInUrlRaw;
  const unauthenticatedUrl = configuredSignInUrl.startsWith("http")
    ? configuredSignInUrl
    : new URL(configuredSignInUrl, req.nextUrl.origin).toString();

  if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) {
    const url = req?.nextUrl?.clone?.();
    if (!url) return NextResponse.next();
    url.pathname = "/login";
    return NextResponse.redirect(url, 308);
  }

  const authState = await auth();
  const authStateObj = authState as unknown as { userId?: unknown; sessionClaims?: unknown };
  const userId = authStateObj?.userId != null ? String(authStateObj.userId) : null;
  const claims = authStateObj?.sessionClaims;

  // Legacy System.OS -> canonical flow via /login redirect param.
  // LoginPageClient will convert /system to the villa path using orgSlug.
  if (pathname === "/system-os" || pathname.startsWith("/system-os/")) {
    const rest = pathname.slice("/system-os".length) || "";
    const url = req?.nextUrl?.clone?.();
    if (!url) return NextResponse.next();
    url.pathname = "/login";
    url.searchParams.set("redirect", `/system${rest}`);
    return NextResponse.redirect(url, 308);
  }

  // Normalize login redirect param if it points to legacy /system-os
  if (pathname === "/login") {
    const redirectParam = req?.nextUrl?.searchParams?.get("redirect");
    if (
      redirectParam &&
      (redirectParam === "/system-os" || redirectParam.startsWith("/system-os/"))
    ) {
      const rest = redirectParam.slice("/system-os".length) || "";
      const url = req?.nextUrl?.clone?.();
      if (!url) return NextResponse.next();
      url.searchParams.set("redirect", `/system${rest}`);
      return NextResponse.redirect(url, 308);
    }
  }

  // Never redirect API routes
  if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
    if (pathname === "/api/system/maintenance") {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  const maintenanceMode = await isMaintenanceModeEnabled(req.nextUrl.origin);
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
    const isStatic =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/public/");

    if (!isStatic && !pathname.startsWith("/maintenance")) {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.redirect(url, 307);
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

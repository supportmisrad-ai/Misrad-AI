import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk",
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req?.nextUrl?.pathname ?? "";

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
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();

    return NextResponse.json({
      success: true,
      authenticated: Boolean(userId),
      userId: userId || null,
      hasSessionClaims: Boolean(sessionClaims),
      email: sessionClaims?.email || null,
      clerkKeys: {
        publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 15) || null,
        secretKeyPrefix: process.env.CLERK_SECRET_KEY?.slice(0, 8) || null,
        domain: process.env.NEXT_PUBLIC_CLERK_DOMAIN || null,
      },
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

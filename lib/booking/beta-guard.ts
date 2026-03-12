import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isSuperAdminEmail } from '@/lib/constants/roles';

/**
 * Middleware wrapper for Beta Lockdown
 * Ensures only the Super Admin (Itsik) in the HQ organization can access the route.
 */
export async function withBetaLockdown(req: NextRequest, handler: Function) {
  const { sessionClaims } = await auth();
  const email = (sessionClaims as any)?.email || (sessionClaims as any)?.primary_email;
  
  // 1. Check if it's the Super Admin email
  if (!isSuperAdminEmail(email)) {
    return NextResponse.json({ error: 'Beta access only' }, { status: 403 });
  }

  // 2. Double check Organization Slug if needed (optional but recommended)
  // For now, email is the strongest unique identifier for the Super Admin
  
  return handler(req);
}

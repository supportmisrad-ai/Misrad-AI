import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getClerkServerAuth(): Promise<{ userId: string | null; error: string | null }> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    return { userId: userId || null, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error || '');
    return { userId: null, error: msg || 'Unknown error' };
  }
}

async function getClerkCurrentUser(): Promise<Awaited<ReturnType<(typeof import('@clerk/nextjs/server'))['currentUser']>>> {
  const { currentUser } = await import('@clerk/nextjs/server');
  return currentUser();
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'NotFound' }, { status: 404 });
  }

  const { userId, error: serverAuthError } = await getClerkServerAuth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized', serverAuthError }, { status: 401 });
  }

  const user = await getClerkCurrentUser();

  return NextResponse.json({
    ok: true,
    clerkUserId: userId,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    emails: Array.isArray(user?.emailAddresses)
      ? user.emailAddresses
          .map((e) => (e ? String(e.emailAddress || '') : ''))
          .map((e) => e.trim())
          .filter(Boolean)
      : [],
  });
}

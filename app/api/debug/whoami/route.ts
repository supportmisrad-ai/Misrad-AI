import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'NotFound' }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();

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

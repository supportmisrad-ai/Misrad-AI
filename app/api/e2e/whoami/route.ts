import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const expected = process.env.E2E_API_KEY;
  const provided = req.headers.get('x-e2e-key');

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const clerk = await currentUser();

  return NextResponse.json({
    ok: true,
    clerkUserId: userId,
    email: clerk?.primaryEmailAddress?.emailAddress ?? null,
  });
}

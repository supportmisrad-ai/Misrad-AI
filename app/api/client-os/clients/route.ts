import { NextRequest } from 'next/server';
import { getClientOsClients } from '@/lib/server/clientOsClients';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  await getAuthenticatedUser();
  return getClientOsClients(request);
}

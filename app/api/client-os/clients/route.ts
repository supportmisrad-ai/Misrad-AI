import { NextRequest } from 'next/server';
import { getClientOsClients } from '@/lib/server/clientOsClients';
import { getAuthenticatedUser } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const dynamic = 'force-dynamic';

async function GETHandler(request: NextRequest) {
  await getAuthenticatedUser();
  return getClientOsClients(request);
}

export const GET = shabbatGuard(GETHandler);

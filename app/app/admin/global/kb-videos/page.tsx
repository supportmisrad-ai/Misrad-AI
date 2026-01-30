import React from 'react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminGlobalKbVideosPage() {
  redirect('/app/admin/global/help-videos');
}

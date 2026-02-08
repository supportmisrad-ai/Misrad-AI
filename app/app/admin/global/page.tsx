import React from 'react';
import { redirect } from 'next/navigation';
import GlobalAdminPageClient from '@/app/app/admin/global/GlobalAdminPageClient';

export const dynamic = 'force-dynamic';

export default async function AdminGlobalPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const tab = typeof sp?.tab === 'string' ? sp?.tab : undefined;
  if (tab === 'control') redirect('/app/admin/global/control');
  if (tab === 'ai') redirect('/app/admin/global/ai');
  if (tab === 'data') redirect('/app/admin/global/data');
  if (tab === 'updates') redirect('/app/admin/global/updates');
  if (tab === 'users') redirect('/app/admin/global/users');
  if (tab === 'versions') redirect('/app/admin/global/versions');
  if (tab === 'approvals') redirect('/app/admin/global/approvals');
  if (tab === 'announcements') redirect('/app/admin/global/announcements');

  if (!tab) {
    redirect('/app/admin/global/control');
  }

  return <GlobalAdminPageClient />;
}

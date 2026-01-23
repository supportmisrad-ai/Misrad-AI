import React from 'react';
import GlobalAdminPageClient from './GlobalAdminPageClient';

export const dynamic = 'force-dynamic';

export default async function AdminGlobalPage() {
  return <GlobalAdminPageClient />;
}

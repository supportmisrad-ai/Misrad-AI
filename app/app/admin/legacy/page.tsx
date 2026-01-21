import React from 'react';
import { SaaSAdminView } from '@/views/SaaSAdminView';

export const dynamic = 'force-dynamic';

export default async function AdminLegacyConsolePage() {
  return (
    <div className="-m-4 md:-m-8">
      <SaaSAdminView />
    </div>
  );
}

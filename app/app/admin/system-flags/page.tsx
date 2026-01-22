'use client';

import React from 'react';
import { SystemControlPanel } from '@/components/saas/SystemControlPanel';
import { useData } from '@/context/DataContext';

export default function AdminSystemFlagsPage() {
  const { organization, updateSystemFlag } = useData();

  return (
    <div>
      <SystemControlPanel organization={organization} updateSystemFlag={updateSystemFlag} />
    </div>
  );
}

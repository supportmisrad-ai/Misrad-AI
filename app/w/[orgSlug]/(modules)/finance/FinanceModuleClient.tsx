'use client';

import React from 'react';
import { OSModuleProvider } from '@/contexts/OSModuleContext';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import FinanceApp from '@/components/finance/FinanceApp';

export default function FinanceModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialFinanceOverview,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialFinanceOverview?: any;
}) {
  return (
    <OSModuleProvider initialModule="finance">
      <ToastProvider>
        <AuthProvider initialCurrentUser={initialCurrentUser}>
          <BrandProvider initialBrandName={initialOrganization?.name}>
            <FinanceApp initialFinanceOverview={initialFinanceOverview} />
          </BrandProvider>
        </AuthProvider>
      </ToastProvider>
    </OSModuleProvider>
  );
}

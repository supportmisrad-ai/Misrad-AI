'use client';

import React from 'react';
import { OSModuleProvider } from '@/contexts/OSModuleContext';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import FinanceApp from '@/components/finance/FinanceApp';
import { useShabbat } from '@/hooks/useShabbat';
import { ShabbatScreen } from '@/components/ShabbatScreen';

export default function FinanceModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialFinanceOverview,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialFinanceOverview?: any;
}) {
  const { isShabbat, isLoading } = useShabbat();

  if (!isLoading && isShabbat) {
    return <ShabbatScreen />;
  }

  return (
    <OSModuleProvider initialModule="finance">
      <ToastProvider>
        <AuthProvider initialCurrentUser={initialCurrentUser}>
          <BrandProvider initialBrandName={initialOrganization?.name}>
            <FinanceApp
              initialFinanceOverview={initialFinanceOverview}
              initialCurrentUser={initialCurrentUser}
              initialOrganization={initialOrganization}
            />
          </BrandProvider>
        </AuthProvider>
      </ToastProvider>
    </OSModuleProvider>
  );
}

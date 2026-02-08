'use client';

import React from 'react';
import { OSModuleProvider } from '@/contexts/OSModuleContext';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import { DataProvider } from '@/context/DataContext';
import FinanceShell from './FinanceShell';
import { useShabbat } from '@/hooks/useShabbat';
import { ShabbatScreen } from '@/components/ShabbatScreen';
import type { OrganizationProfile, User } from '@/types';

export default function FinanceModuleClient({
  children,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
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
            <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
              <FinanceShell initialOrganization={initialOrganization}>
                {children}
              </FinanceShell>
            </DataProvider>
          </BrandProvider>
        </AuthProvider>
      </ToastProvider>
    </OSModuleProvider>
  );
}

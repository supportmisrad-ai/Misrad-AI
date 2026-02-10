'use client';

import ClientOSApp, { type ClientOSUserData } from '@/components/client-os-full/ClientOSApp';
import type { OrganizationProfile, User } from '@/types';
import { useShabbat } from '@/hooks/useShabbat';
import { ShabbatScreen } from '@/components/ShabbatScreen';

export default function ClientModuleClient({
  userData,
  initialCurrentUser,
  initialOrganization,
}: {
  userData: ClientOSUserData;
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
}) {
  const { isShabbat, isLoading } = useShabbat();

  const isShabbatProtected = initialOrganization?.isShabbatProtected !== false;

  if (!isLoading && isShabbat && isShabbatProtected) {
    return <ShabbatScreen />;
  }

  return <ClientOSApp userData={userData} initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization} />;
}

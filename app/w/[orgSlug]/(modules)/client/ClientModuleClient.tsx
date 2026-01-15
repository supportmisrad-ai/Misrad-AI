'use client';

import ClientOSApp from '@/components/client-os-full/ClientOSApp';
import { useShabbat } from '@/hooks/useShabbat';
import { ShabbatScreen } from '@/components/ShabbatScreen';

export default function ClientModuleClient({
  userData,
  initialCurrentUser,
  initialOrganization,
}: {
  userData: any;
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  const { isShabbat, isLoading } = useShabbat();

  if (!isLoading && isShabbat) {
    return <ShabbatScreen />;
  }

  return <ClientOSApp userData={userData} initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization} />;
}

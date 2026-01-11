'use client';

import ClientOSApp from '@/components/client-os-full/ClientOSApp';

export default function ClientModuleClient({
  userData,
}: {
  userData: any;
}) {
  return <ClientOSApp userData={userData} />;
}

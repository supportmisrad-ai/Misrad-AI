import ClientWorkspace from '@/components/social/ClientWorkspace';
import ActiveClientFromSearchParams from '@/components/social/ActiveClientFromSearchParams';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';


export default async function WorkspacePage() {
  return (
    <>
      <Suspense fallback={null}>
        <ActiveClientFromSearchParams />
      </Suspense>
      <ClientWorkspace />
    </>
  );
}

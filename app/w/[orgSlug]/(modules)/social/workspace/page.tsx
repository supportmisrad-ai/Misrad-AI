import ClientWorkspace from '@/components/social/ClientWorkspace';
import ActiveClientFromSearchParams from '@/components/social/ActiveClientFromSearchParams';
import { Suspense } from 'react';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls


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

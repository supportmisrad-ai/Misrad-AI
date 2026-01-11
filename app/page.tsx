import { DataProvider } from "../context/DataContext";
import RootPageClient from './RootPageClient';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

export default async function RootPage() {
  // Use server-side auth to check session state
  // Note: keep this resilient to missing Clerk env in production (avoid 500 on '/').
  let userId: string | null = null;
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const authResult = await auth();
    userId = authResult?.userId ?? null;
  } catch (error) {
    console.error('[RootPage] Clerk auth failed:', error);
  }
  
  return (
    <DataProvider>
      <RootPageClient initialUserId={userId} />
    </DataProvider>
  );
}

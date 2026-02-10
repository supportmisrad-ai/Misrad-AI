import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PlatformDashboardClient from './PlatformDashboardClient';

export const metadata = {
  title: 'דשבורד פלטפורמה | Admin',
};

export default async function PlatformDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <PlatformDashboardClient />
    </Suspense>
  );
}

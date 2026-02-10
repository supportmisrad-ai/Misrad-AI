import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BusinessClientsClient from './BusinessClientsClient';

export const metadata = {
  title: 'לקוחות עסקיים | Admin',
  description: 'ניהול לקוחות עסקיים B2B',
};

export default async function BusinessClientsPage() {
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <BusinessClientsClient />
      </Suspense>
    </div>
  );
}

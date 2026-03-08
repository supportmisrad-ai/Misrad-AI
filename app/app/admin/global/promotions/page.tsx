import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import GlobalPromotionsClient from './GlobalPromotionsClient';

export const metadata = {
  title: 'מבצעים גלובליים | Misrad AI',
  description: 'ניהול מבצעים והנחות שמופיעים בכל האתר',
};

export default function GlobalPromotionsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <GlobalPromotionsClient />
      </Suspense>
    </div>
  );
}

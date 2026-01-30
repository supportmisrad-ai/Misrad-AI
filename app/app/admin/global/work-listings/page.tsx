import React from 'react';
import { Share2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import WorkListingsAdminClient from './WorkListingsAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminGlobalWorkListingsPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="Work Listings" subtitle="כל ההצעות שנוצרו מהמערכת (לינק / זירה)" icon={Share2} />
      <WorkListingsAdminClient />
    </div>
  );
}

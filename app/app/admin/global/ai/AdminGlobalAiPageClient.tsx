'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { AiBrainPanel } from '@/components/saas/AiBrainPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminGlobalAiPageClient() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="AI" subtitle="מוח ה-AI" icon={Sparkles} />
      <AiBrainPanel hideHeader />
    </div>
  );
}

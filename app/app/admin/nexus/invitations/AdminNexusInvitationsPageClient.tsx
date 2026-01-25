'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { InvitationLinksPanel } from '@/components/saas/InvitationLinksPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminNexusInvitationsPageClient() {
  const { addToast } = useData();

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="הזמנות" subtitle="קישורי הזמנה למשתמשים" icon={Link} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl">
          <InvitationLinksPanel addToast={addToast as any} hideHeader />
        </div>
      </motion.div>
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UpdatesTab } from '@/components/settings/UpdatesTab';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { RefreshCw } from 'lucide-react';

export default function AdminGlobalUpdatesPageClient() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="space-y-6 pb-24" dir="rtl">
        <AdminPageHeader title="עדכונים" subtitle="Change Log לכל משתמשי הפלטפורמה" icon={RefreshCw} />
        <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-8 text-slate-900 shadow-sm">
          <UpdatesTab readOnly={false} />
        </div>
      </div>
    </motion.div>
  );
}

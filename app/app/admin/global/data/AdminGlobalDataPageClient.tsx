'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DataTab } from '@/components/settings/SystemTabs';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Database } from 'lucide-react';

export default function AdminGlobalDataPageClient() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="space-y-6 pb-24" dir="rtl">
        <AdminPageHeader title="דאטה" subtitle="ייצוא נתונים מערכתי ושחזור מאסון" icon={Database} />
        <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-8 text-slate-900 shadow-sm">
          <DataTab />
        </div>
      </div>
    </motion.div>
  );
}

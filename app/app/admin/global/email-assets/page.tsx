import React from 'react';
import { Mail } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import EmailAssetsClient from './EmailAssetsClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function EmailAssetsPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="תמונות מיילים" subtitle="ניהול תמונות, לוגואים, באנרים וויזואלים של מערכת המיילים" icon={Mail} />
      <EmailAssetsClient />
    </div>
  );
}

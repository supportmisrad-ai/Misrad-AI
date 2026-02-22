import React from 'react';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getOrganizationDetails } from '@/app/actions/manage-organization';
import ManageOrganizationClient from '@/components/admin/ManageOrganizationClient';

export const metadata = {
  title: 'ניהול ארגון | Admin',
  description: 'ממשק ניהול מקיף לארגון - הגדרות, חבילות, משתמשים וחיוב',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManageOrganizationPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch organization data
  const result = await getOrganizationDetails(id);

  // Handle errors
  if (!result.ok) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <Link
            href="/app/admin/organizations"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-3xl font-black text-slate-900">ניהול ארגון</h1>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-black text-red-900 mb-2">❌ שגיאה</h3>
          <p className="text-red-700">{result.error}</p>
          <Link
            href="/app/admin/organizations"
            className="inline-block mt-4 text-sm text-red-600 hover:text-red-700 underline"
          >
            חזור לרשימת הארגונים
          </Link>
        </div>
      </div>
    );
  }

  const organization = result.organization;

  // TypeScript guard: at this point, result.ok is true so organization must exist
  if (!organization) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-black text-red-900 mb-2">❌ שגיאה</h3>
          <p className="text-red-700">ארגון לא נמצא</p>
          <Link
            href="/app/admin/organizations"
            className="inline-block mt-4 text-sm text-red-600 hover:text-red-700 underline"
          >
            חזור לרשימת הארגונים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/admin/organizations"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">ניהול ארגון</h1>
      </div>

      {/* Client Component with Tabs */}
      <ManageOrganizationClient initialData={organization} />
    </div>
  );
}

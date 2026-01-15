import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React from 'react';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  ...getSystemMetadata('finance'),
  icons: {
    icon: [{ url: '/icons/finance-icon.svg', type: 'image/svg+xml' }],
    apple: '/icons/finance-icon.svg',
    shortcut: '/icons/finance-icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'theme-color': '#059669',
  },
};

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const clerkUserId = await getCurrentUserId();
    if (clerkUserId) {
      const supabase = createClient();
      const { data: user } = await supabase
        .from('social_users')
        .select('organization_id')
        .eq('clerk_user_id', clerkUserId)
        .single();

      const organizationId = user?.organization_id;
      if (!organizationId) {
        redirect('/subscribe/checkout');
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('has_finance')
        .eq('id', organizationId)
        .single();

      if (!orgError && org && org.has_finance === false) {
        redirect('/subscribe/checkout');
      }
    }
  } catch {
  }

  return (
    <div className="min-h-screen bg-transparent font-sans" dir="rtl">
      {children}
    </div>
  );
}

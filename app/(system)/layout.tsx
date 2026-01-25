import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React from 'react';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';

// Force dynamic rendering as this layout depends on authentication
export const dynamic = 'force-dynamic';

/**
 * System.OS Layout
 * 
 * This is the main layout for System.OS (Sales & Leads management).
 * SystemApp already includes all necessary providers (AuthProvider, ToastProvider, etc.)
 */

export const metadata: Metadata = {
  ...getSystemMetadata('system'),
  icons: {
    icon: [
      { url: '/icons/system-icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/system-icon.svg',
    shortcut: '/icons/system-icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'theme-color': '#A21D3C',
  },
};

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: require System room access
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
        .select('has_system')
        .eq('id', organizationId)
        .single();

      if (!orgError && org && org.has_system === false) {
        redirect('/subscribe/checkout');
      }
    }
  } catch {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-transparent font-sans" dir="rtl">
      {children}
    </div>
  );
}

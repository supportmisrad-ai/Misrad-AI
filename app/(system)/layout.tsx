import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React from 'react';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';

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

  const def = getModuleDefinition('system');
  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)] text-slate-900 font-sans" dir="rtl">
      {children}
    </div>
  );
}

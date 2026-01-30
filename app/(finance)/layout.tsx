import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React from 'react';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = getSystemMetadata('finance');

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
    redirect('/sign-in');
  }

  const def = getModuleDefinition('finance');
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

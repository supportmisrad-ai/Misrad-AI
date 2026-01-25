import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';

// Force dynamic rendering as this layout depends on authentication
export const dynamic = 'force-dynamic';

/**
 * Nexus OS Layout
 * 
 * This layout wraps all Nexus OS routes.
 * The actual Layout component is used inside app/app/page.tsx with react-router.
 */

export const metadata: Metadata = {
  ...getSystemMetadata('nexus'),
  icons: {
    icon: [
      { url: '/icons/nexus-icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/nexus-icon.svg',
    shortcut: '/icons/nexus-icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'theme-color': '#3730A3',
  },
};

export default async function NexusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: require Nexus room access
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
        .select('has_nexus')
        .eq('id', organizationId)
        .single();

      if (!orgError && org && org.has_nexus === false) {
        redirect('/subscribe/checkout');
      }
    }
  } catch {
    redirect('/sign-in');
  }

  return <>{children}</>;
}


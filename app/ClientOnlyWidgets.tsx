'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { AiAssistantWidget } from '@/components/ai/AiAssistantWidget';

const PasskeyOnboardingPrompt = dynamic(
  () => import('@/components/PasskeyOnboardingPrompt').then((m) => m.PasskeyOnboardingPrompt),
  { ssr: false, loading: () => null }
);

const VoiceCommandFab = dynamic(
  () => import('@/components/voice/VoiceCommandFab').then((m) => m.VoiceCommandFab),
  { ssr: false, loading: () => null }
);

const ComingSoonPortal = dynamic(() => import('@/components/shared/ComingSoonPortal'), {
  ssr: false,
  loading: () => null,
});

function isSalesPathname(pathname: string): boolean {
  const p = String(pathname || '/').toLowerCase();
  if (p.startsWith('/w/')) return false;
  if (p === '/admin' || p.startsWith('/admin/')) return false;
  if (p === '/login' || p.startsWith('/login/')) return false;
  if (p === '/sign-in' || p.startsWith('/sign-in/')) return false;
  if (p === '/sign-up' || p.startsWith('/sign-up/')) return false;
  if (p === '/sign-out' || p.startsWith('/sign-out/')) return false;
  if (p === '/reset-password' || p.startsWith('/reset-password/')) return false;
  return true;
}

export function ClientOnlyClerkWidgets() {
  const pathname = usePathname();
  const showFAB = isSalesPathname(pathname || '/');

  return (
    <>
      <PasskeyOnboardingPrompt />
      {showFAB && <AiAssistantWidget />}
    </>
  );
}

export function ClientOnlyGlobalWidgets() {
  return (
    <>
      <VoiceCommandFab />
      <ComingSoonPortal />
    </>
  );
}

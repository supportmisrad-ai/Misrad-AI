'use client';

import dynamic from 'next/dynamic';

const PasskeyOnboardingPrompt = dynamic(
  () => import('@/components/PasskeyOnboardingPrompt').then((m) => m.PasskeyOnboardingPrompt),
  { ssr: false, loading: () => null }
);

const AiAssistantWidget = dynamic(
  () => import('@/components/ai/AiAssistantWidget').then((m) => m.AiAssistantWidget),
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

export function ClientOnlyClerkWidgets() {
  return (
    <>
      <PasskeyOnboardingPrompt />
      <AiAssistantWidget />
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

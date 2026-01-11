'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';

export default function ActiveClientFromSearchParams() {
  const params = useSearchParams();
  const clientId = params.get('clientId');
  const onboarding = params.get('onboarding');

  const { setActiveClientId, setIsOnboardingMode } = useApp();

  useEffect(() => {
    if (!clientId) return;
    setActiveClientId(clientId);
    setIsOnboardingMode(onboarding === '1');
  }, [clientId, onboarding, setActiveClientId, setIsOnboardingMode]);

  return null;
}

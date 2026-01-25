'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { FeatureRequestsPanel } from '@/components/saas/FeatureRequestsPanel';

export default function AdminClientFeaturesPageClient() {
  const { addToast } = useData();
  return <FeatureRequestsPanel addToast={addToast as any} />;
}

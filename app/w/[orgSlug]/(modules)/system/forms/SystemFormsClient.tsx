'use client';

import React from 'react';
import FormsView from '@/components/system/FormsView';

export default function SystemFormsClient({
  orgSlug: _orgSlug,
}: {
  orgSlug: string;
}) {
  return <FormsView />;
}

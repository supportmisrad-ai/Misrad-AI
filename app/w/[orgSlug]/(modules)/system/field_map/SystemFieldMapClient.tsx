'use client';

import React from 'react';
import FieldMapView from '@/components/system/FieldMapView';

export default function SystemFieldMapClient({
  orgSlug: _orgSlug,
}: {
  orgSlug: string;
}) {
  return <FieldMapView />;
}

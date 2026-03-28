import React from 'react';
import BroadcastHistoryClient from '../BroadcastHistoryClient';
// Build cache refresh

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'היסטוריית מיילים | MISRAD AI',
};

export default function BroadcastHistoryPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <BroadcastHistoryClient />
    </div>
  );
}

import React from 'react';
import BroadcastHistoryClient from './BroadcastHistoryClient';

export const metadata = {
  title: 'היסטוריית מיילים | MISRAD AI',
};

export default function BroadcastHistoryPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <BroadcastHistoryClient />
    </div>
  );
}

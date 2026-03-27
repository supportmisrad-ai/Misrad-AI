import React from 'react';
import BroadcastEmailClient from './BroadcastEmailClient';

export const metadata = {
  title: 'שליחת מייל מרובה נמענים | MISRAD AI',
};

export default function BroadcastEmailPage() {
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <BroadcastEmailClient />
    </div>
  );
}

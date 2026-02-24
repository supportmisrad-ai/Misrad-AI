import React from 'react';
import { requireSuperAdmin } from '@/lib/auth';
import CouponsAdminClient from './CouponsAdminClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ניהול קופונים | Misrad AI Admin',
  description: 'יצירה, עריכה וניהול קופונים ושותפים',
};

export default async function CouponsAdminPage() {
  await requireSuperAdmin();

  return <CouponsAdminClient />;
}

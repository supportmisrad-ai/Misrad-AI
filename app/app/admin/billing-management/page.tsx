/**
 * Billing Management - Admin Page
 *
 * Shows audit trail of all billing events
 * for monitoring and troubleshooting payments
 */

import React from 'react';
import { requireSuperAdmin } from '@/lib/auth';
import BillingManagementClient from './BillingManagementClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ניהול גבייה | Misrad AI Admin',
  description: 'מעקב אחר אירועי חיוב ותשלומים',
};

export default async function BillingManagementPage() {
  await requireSuperAdmin();

  return <BillingManagementClient />;
}

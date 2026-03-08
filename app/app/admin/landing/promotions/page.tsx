import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth';
import { requireAuth } from '@/lib/errorHandler';
import AdminContextualBannersPageClient from './AdminContextualBannersPageClient';

export const metadata: Metadata = {
  title: 'באנרים תקופתיים | Misrad AI',
  description: 'ניהול באנרים תקופתיים לדפי שיווק',
};

export default async function AdminContextualBannersPage() {
  await requireAuth();
  await requireSuperAdmin();
  return <AdminContextualBannersPageClient />;
}

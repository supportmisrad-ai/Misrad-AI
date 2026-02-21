// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import { redirect } from 'next/navigation';
import ContractorsPageClient from './ContractorsPageClient';
import {
  createOperationsContractorToken,
  createOperationsSupplier,
  deleteOperationsSupplier,
  getOperationsSuppliers,
} from '@/app/actions/operations';

export default async function OperationsContractorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const errorRaw = sp.error;
  const error = errorRaw ? String(Array.isArray(errorRaw) ? errorRaw[0] : errorRaw) : null;
  const newTokenRaw = sp.newToken;
  const newToken = newTokenRaw ? String(Array.isArray(newTokenRaw) ? newTokenRaw[0] : newTokenRaw) : null;
  const newTokenLabel = sp.tokenLabel ? String(Array.isArray(sp.tokenLabel) ? sp.tokenLabel[0] : sp.tokenLabel) : null;

  const suppliersRes = await getOperationsSuppliers({ orgSlug });
  const suppliers = suppliersRes.success ? suppliersRes.data ?? [] : [];

  async function createTokenAction(formData: FormData) {
    'use server';
    const label = String(formData.get('label') || '').trim();
    const ttlRaw = String(formData.get('ttl') || '72');
    const ttlHours = Number.isFinite(parseInt(ttlRaw, 10)) ? parseInt(ttlRaw, 10) : 72;
    const res = await createOperationsContractorToken({ orgSlug, contractorLabel: label || undefined, ttlHours });
    if (!res.success || !res.token) {
      redirect(`${base}/contractors?error=${encodeURIComponent(res.error || 'שגיאה ביצירת טוקן')}`);
    }
    redirect(`${base}/contractors?newToken=${encodeURIComponent(res.token)}&tokenLabel=${encodeURIComponent(label || 'קבלן')}`);
  }

  async function addSupplierAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const contactName = String(formData.get('contactName') || '').trim() || null;
    const phone = String(formData.get('phone') || '').trim() || null;
    const email = String(formData.get('email') || '').trim() || null;
    const notes = String(formData.get('notes') || '').trim() || null;
    const res = await createOperationsSupplier({ orgSlug, name, contactName, phone, email, notes });
    if (!res.success) redirect(`${base}/contractors?error=${encodeURIComponent(res.error || 'שגיאה בהוספת ספק')}`);
    redirect(`${base}/contractors?tab=suppliers`);
  }

  async function deleteSupplierAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsSupplier({ orgSlug, id });
    if (!res.success) redirect(`${base}/contractors?error=${encodeURIComponent(res.error || 'שגיאה במחיקת ספק')}`);
    redirect(`${base}/contractors?tab=suppliers`);
  }

  return (
    <ContractorsPageClient
      error={error}
      newToken={newToken}
      newTokenLabel={newTokenLabel}
      suppliers={suppliers}
      createTokenAction={createTokenAction}
      addSupplierAction={addSupplierAction}
      deleteSupplierAction={deleteSupplierAction}
    />
  );
}

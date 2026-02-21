import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { getFinanceInvoices } from '@/lib/services/finance-service';
import FinanceInvoicesClient from './FinanceInvoicesClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function FinanceInvoicesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const canViewFinancials = await hasPermission('view_financials');
  const invoices = canViewFinancials ? await getFinanceInvoices({ organizationId: workspace.id }) : [];

  return <FinanceInvoicesClient invoices={invoices} />;
}

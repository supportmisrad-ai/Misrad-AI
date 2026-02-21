import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { getFinanceExpensesData } from '@/lib/services/finance-service';
import FinanceExpensesClient from './FinanceExpensesClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function FinanceExpensesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const canViewFinancials = await hasPermission('view_financials');
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const expenses = canViewFinancials
    ? await getFinanceExpensesData({
        organizationId: workspace.id,
        dateRange: {
          from: start.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0],
        },
      })
    : null;

  return <FinanceExpensesClient expenses={expenses} />;
}

import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { getFinanceExpensesData } from '@/lib/services/finance-service';
import FinanceExpensesClient from './FinanceExpensesClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

function parseDateParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function FinanceExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams: Promise<{ from?: string; to?: string }> | { from?: string; to?: string };
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = parseDateParam(sp.from, defaultStart);
  const to = parseDateParam(sp.to, now);

  // Run workspace access and permission check in parallel
  const [workspace, canViewFinancials] = await Promise.all([
    requireWorkspaceAccessByOrgSlug(orgSlug),
    hasPermission('view_financials'),
  ]);

  const expenses = canViewFinancials
    ? await getFinanceExpensesData({
        organizationId: workspace.id,
        dateRange: {
          from: from.toISOString().split('T')[0],
          to: to.toISOString().split('T')[0],
        },
      })
    : null;

  return (
    <FinanceExpensesClient
      expenses={expenses}
      initialFrom={from.toISOString().split('T')[0]}
      initialTo={to.toISOString().split('T')[0]}
    />
  );
}

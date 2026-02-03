import { redirect } from 'next/navigation';
import { requireCurrentOrganizationId } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function FinanceExpensesRootRedirect() {
  const organizationId = await requireCurrentOrganizationId();

  const org = await prisma.social_organizations.findUnique({
    where: { id: String(organizationId) },
    select: { slug: true },
  });

  if (!org?.slug) {
    redirect('/workspaces');
  }

  redirect(`/w/${encodeURIComponent(String(org.slug))}/finance/expenses`);
}

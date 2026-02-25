import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import LeadCaptureForm from './LeadCaptureForm';

type Props = { params: Promise<{ orgSlug: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildOrgWhere(orgSlug: string) {
  const conditions: Record<string, string>[] = [{ slug: orgSlug }];
  if (UUID_RE.test(orgSlug)) conditions.push({ id: orgSlug });
  return { OR: conditions, subscription_status: { not: 'expired' } };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await prisma.organization.findFirst({
    where: buildOrgWhere(orgSlug),
    select: { name: true },
  });

  const title = org ? `צור קשר עם ${org.name}` : 'צור קשר';
  return {
    title,
    description: 'השאירו פרטים ונחזור אליכם בהקדם',
    robots: { index: false, follow: false },
  };
}

export default async function LeadCapturePage({ params }: Props) {
  const { orgSlug } = await params;

  const org = await prisma.organization.findFirst({
    where: buildOrgWhere(orgSlug),
    select: { id: true, name: true, slug: true },
  });

  if (!org) {
    notFound();
  }

  return <LeadCaptureForm orgSlug={org.slug || orgSlug} orgName={org.name || ''} />;
}

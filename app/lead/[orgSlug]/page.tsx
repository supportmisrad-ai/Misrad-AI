import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import LeadCaptureForm from './LeadCaptureForm';

type Props = { params: Promise<{ orgSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug: orgSlug }, { id: orgSlug }], subscription_status: { not: 'expired' } },
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
    where: { OR: [{ slug: orgSlug }, { id: orgSlug }], subscription_status: { not: 'expired' } },
    select: { id: true, name: true, slug: true },
  });

  if (!org) {
    notFound();
  }

  return <LeadCaptureForm orgSlug={org.slug || orgSlug} orgName={org.name || ''} />;
}

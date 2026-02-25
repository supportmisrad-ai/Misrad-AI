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

  // Check if lead capture is enabled
  const settings = await prisma.organization_settings.findUnique({
    where: { organization_id: org.id },
    select: { ai_sales_context: true },
  });
  const salesCtx = (settings?.ai_sales_context && typeof settings.ai_sales_context === 'object' && !Array.isArray(settings.ai_sales_context))
    ? (settings.ai_sales_context as Record<string, unknown>)
    : {};
  const enabled = salesCtx.leadCaptureEnabled === true;

  if (!enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-black text-slate-900 mb-2">הטופס אינו זמין</h1>
          <p className="text-slate-500 text-sm">טופס קליטת הלידים אינו פעיל כרגע.</p>
        </div>
      </div>
    );
  }

  return <LeadCaptureForm orgSlug={org.slug || orgSlug} orgName={org.name || ''} />;
}

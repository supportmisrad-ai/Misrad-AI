import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBotLeadById } from '@/app/actions/bot-leads';
import { BotLeadDetailClient } from '@/components/admin/bot-leads/bot-lead-detail-client';

interface BotLeadDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: BotLeadDetailPageProps): Promise<Metadata> {
  const { lead } = await getBotLeadById(params.id);
  
  return {
    title: lead?.name ? `${lead.name} | ליד` : 'פרטי ליד | MISRAD AI',
    description: 'פרטי ליד ושיחות מהבוט',
  };
}

export default async function BotLeadDetailPage({ params }: BotLeadDetailPageProps) {
  const { lead, conversations } = await getBotLeadById(params.id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <BotLeadDetailClient lead={lead} conversations={conversations} />
    </div>
  );
}

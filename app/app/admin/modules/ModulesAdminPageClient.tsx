'use client';

import React from 'react';
import Link from 'next/link';
import { Boxes, Globe, Network, Settings, ShieldCheck, SlidersHorizontal, BrainCircuit } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type ModuleAction = { label: string; href: string };
type ModuleCard = { title: string; description: string; icon: React.ElementType; actions: ModuleAction[] };

export default function ModulesAdminPageClient() {
  const cards: ModuleCard[] = [
    {
      title: 'נקסוס',
      description: 'בקרת מערכת, בינה, הזמנות והודעות מערכת של נקסוס.',
      icon: Network,
      actions: [
        { label: 'בקרת מערכת', href: '/app/admin/nexus/control' },
        { label: 'בינה', href: '/app/admin/nexus/intelligence' },
        { label: 'הזמנות', href: '/app/admin/nexus/invitations' },
        { label: 'הודעות מערכת', href: '/app/admin/nexus/announcements' },
      ],
    },
    {
      title: 'סושיאל',
      description: 'ניהול מרכזי של מודול סושיאל: צוות, מכסות ואוטומציות.',
      icon: ShieldCheck,
      actions: [
        { label: 'מבט על', href: '/app/admin/social?tab=overview' },
        { label: 'צוות', href: '/app/admin/social?tab=team' },
        { label: 'אינטגרציות', href: '/app/admin/social?tab=integrations' },
        { label: 'מכסות', href: '/app/admin/social?tab=quotas' },
      ],
    },
    {
      title: 'מערכת',
      description: 'בקרה והודעות מערכת System OS.',
      icon: Settings,
      actions: [
        { label: 'בקרת מערכת', href: '/app/admin/system/control' },
        { label: 'הודעות מערכת', href: '/app/admin/system/announcements' },
      ],
    },
    {
      title: 'דף נחיתה',
      description: 'תוכן, תמחור ומיתוג של האתר הציבורי.',
      icon: Globe,
      actions: [
        { label: 'תמחור', href: '/app/admin/landing/pricing' },
        { label: 'תוכן', href: '/app/admin/landing/content' },
        { label: 'לינקים לתשלום', href: '/app/admin/landing/payment-links' },
        { label: 'מיתוג', href: '/app/admin/landing/branding' },
      ],
    },
    {
      title: 'תשתית פלטפורמה',
      description: 'מתגי מערכת, בקרת פלטפורמה וכלים גלובליים.',
      icon: SlidersHorizontal,
      actions: [
        { label: 'מתגי מערכת', href: '/app/admin/system-flags' },
        { label: 'בקרת פלטפורמה', href: '/app/admin/global/control' },
        { label: 'מרכז קישורים', href: '/app/admin/global/links' },
        { label: 'הורדות', href: '/app/admin/global/downloads' },
      ],
    },
    {
      title: 'בינה מלאכותית',
      description: 'ניתוח AI ומוח AI גלובלי.',
      icon: BrainCircuit,
      actions: [
        { label: 'ניתוח AI', href: '/app/admin/ai' },
        { label: 'מוח AI (גלובלי)', href: '/app/admin/global/ai' },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="ניהול מודולים" subtitle="מרכז קיצורים לבקרת מוצרים ומודולים" icon={Boxes} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">{card.title}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">{card.description}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {card.actions.map((action) => (
                  <Link
                    key={`${card.title}-${action.href}`}
                    href={action.href}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 transition-colors"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

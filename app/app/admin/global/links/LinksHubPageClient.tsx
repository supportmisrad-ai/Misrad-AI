'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Briefcase,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  Link2,
  Search,
  Shield,
} from 'lucide-react';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';

type HubCategory =
  | 'שיווק'
  | 'תמיכה והדרכה'
  | 'משפטי'
  | 'Auth'
  | 'אדמין ודשבורדים'
  | 'מערכת (Workspace)'
  | 'תשלומים';

type HubLink = {
  id: string;
  title: string;
  href: string;
  category: HubCategory;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description?: string;
};

function getBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function toAbsoluteUrl(href: string): string {
  const base = getBaseUrl();
  if (!base) return href;
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  return `${base}${href}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      ta.remove();
    }
  }
}

function iconForCategory(category: HubCategory) {
  if (category === 'שיווק') return Globe;
  if (category === 'תמיכה והדרכה') return LifeBuoy;
  if (category === 'משפטי') return FileText;
  if (category === 'Auth') return KeyRound;
  if (category === 'אדמין ודשבורדים') return Shield;
  if (category === 'מערכת (Workspace)') return Briefcase;
  return Link2;
}

function getLinks(): HubLink[] {
  return [
    {
      id: 'm-social',
      title: 'Social · דף נחיתה',
      href: '/social',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-pricing',
      title: 'Pricing · מחירון',
      href: '/pricing',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-about',
      title: 'אודות',
      href: '/about',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-accessibility',
      title: 'הצהרת נגישות',
      href: '/accessibility',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-system',
      title: 'System · דף שיווק',
      href: '/system',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-client',
      title: 'Client · דף שיווק',
      href: '/client',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-nexus',
      title: 'Nexus · דף שיווק',
      href: '/nexus',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-finance',
      title: 'Finance · דף שיווק',
      href: '/finance-landing',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-operations',
      title: 'Operations · דף שיווק',
      href: '/operations',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-the-operator',
      title: 'Landing · The Operator',
      href: '/the-operator',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-the-closer',
      title: 'Landing · The Closer',
      href: '/the-closer',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-the-authority',
      title: 'Landing · The Authority',
      href: '/the-authority',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-the-empire',
      title: 'Landing · The Empire',
      href: '/the-empire',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-solo',
      title: 'Landing · Solo',
      href: '/solo',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-contact',
      title: 'צור קשר',
      href: '/contact',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-portal',
      title: 'Portal',
      href: '/portal',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-chat',
      title: 'Chat',
      href: '/chat',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-maintenance',
      title: 'Maintenance',
      href: '/maintenance',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'm-shabbat',
      title: 'מצב שבת',
      href: '/shabbat',
      category: 'שיווק',
      icon: Globe,
    },
    {
      id: 'legal-terms',
      title: 'תנאי שימוש',
      href: '/terms',
      category: 'משפטי',
      icon: FileText,
    },
    {
      id: 'legal-privacy',
      title: 'מדיניות פרטיות',
      href: '/privacy',
      category: 'משפטי',
      icon: FileText,
    },
    {
      id: 'legal-refund',
      title: 'מדיניות החזרים',
      href: '/refund-policy',
      category: 'משפטי',
      icon: FileText,
    },
    {
      id: 'legal-security',
      title: 'אבטחה',
      href: '/security',
      category: 'משפטי',
      icon: FileText,
    },
    {
      id: 'auth-login',
      title: 'התחברות',
      href: '/login',
      category: 'Auth',
      icon: KeyRound,
    },
    {
      id: 'auth-signin',
      title: 'Sign In (Redirect)',
      href: '/sign-in',
      category: 'Auth',
      icon: KeyRound,
    },
    {
      id: 'auth-signup',
      title: 'הרשמה',
      href: '/login?mode=sign-up',
      category: 'Auth',
      icon: KeyRound,
    },
    {
      id: 'auth-reset-password',
      title: 'איפוס סיסמה',
      href: '/reset-password',
      category: 'Auth',
      icon: KeyRound,
    },
    {
      id: 'auth-me',
      title: 'Me',
      href: '/me',
      category: 'Auth',
      icon: KeyRound,
    },
    {
      id: 'support-public',
      title: 'תמיכה (טופס)',
      href: '/support',
      category: 'תמיכה והדרכה',
      icon: LifeBuoy,
    },
    {
      id: 'support-topic-add-business',
      title: 'תמיכה · בקשה להוספת עסק',
      href: '/support?topic=add-business',
      category: 'תמיכה והדרכה',
      icon: LifeBuoy,
    },
    {
      id: 'support-workspace',
      title: 'תמיכה (Workspace) · אינדקס מודולים',
      href: '/w/{orgSlug}/support',
      category: 'תמיכה והדרכה',
      icon: LifeBuoy,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'support-finance',
      title: 'תמיכה · Finance',
      href: '/w/{orgSlug}/support/finance',
      category: 'תמיכה והדרכה',
      icon: BookOpen,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'support-operations',
      title: 'תמיכה · Operations',
      href: '/w/{orgSlug}/support/operations',
      category: 'תמיכה והדרכה',
      icon: BookOpen,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'support-system',
      title: 'תמיכה · System',
      href: '/w/{orgSlug}/support/system',
      category: 'תמיכה והדרכה',
      icon: BookOpen,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'support-nexus',
      title: 'תמיכה · Nexus',
      href: '/w/{orgSlug}/support/nexus',
      category: 'תמיכה והדרכה',
      icon: BookOpen,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'support-social',
      title: 'תמיכה · Social',
      href: '/w/{orgSlug}/support/social',
      category: 'תמיכה והדרכה',
      icon: BookOpen,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'support-client',
      title: 'תמיכה · Client',
      href: '/w/{orgSlug}/support/client',
      category: 'תמיכה והדרכה',
      icon: BookOpen,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'admin-dashboard',
      title: 'Admin · דשבורד',
      href: '/app/admin',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-modules',
      title: 'Admin · מודולים',
      href: '/app/admin/modules',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-support',
      title: 'Admin · תמיכה',
      href: '/app/admin/support',
      category: 'אדמין ודשבורדים',
      icon: LifeBuoy,
    },
    {
      id: 'admin-ai',
      title: 'Admin · בינה מלאכותית',
      href: '/app/admin/ai',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-logs',
      title: 'Admin · לוגים',
      href: '/app/admin/logs',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-customers',
      title: 'Admin · לקוחות',
      href: '/app/admin/customers',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-users',
      title: 'Admin · לקוחות מערכת (מנויים)',
      href: '/app/admin/users',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-orgs',
      title: 'Admin · ארגונים (Workspaces)',
      href: '/app/admin/organizations',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-tenants',
      title: 'Admin · חשבונות SaaS',
      href: '/app/admin/tenants',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-system-flags',
      title: 'Admin · מתגי מערכת',
      href: '/app/admin/system-flags',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-global-control',
      title: 'Admin · גלובלי · בקרה',
      href: '/app/admin/global/control',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-global-ai',
      title: 'Admin · ניהול AI',
      href: '/app/admin/ai',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-global-links',
      title: 'Admin · גלובלי · מרכז קישורים',
      href: '/app/admin/global/links',
      category: 'אדמין ודשבורדים',
      icon: Link2,
    },
    {
      id: 'admin-global-downloads',
      title: 'Admin · גלובלי · הורדות',
      href: '/app/admin/global/downloads',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-global-help-videos',
      title: 'Admin · גלובלי · ניהול סרטוני הדרכה',
      href: '/app/admin/global/help-videos',
      category: 'אדמין ודשבורדים',
      icon: BookOpen,
    },
    {
      id: 'admin-global-users',
      title: 'Admin · גלובלי · משתמשי מערכת',
      href: '/app/admin/global/users',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-global-data',
      title: 'Admin · גלובלי · דאטה',
      href: '/app/admin/global/data',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-global-updates',
      title: 'Admin · גלובלי · עדכונים',
      href: '/app/admin/global/updates',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-global-versions',
      title: 'Admin · גלובלי · גרסאות',
      href: '/app/admin/global/versions',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-global-approvals',
      title: 'Admin · גלובלי · אישורי משתמשים',
      href: '/app/admin/global/approvals',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-global-announcements',
      title: 'Admin · גלובלי · הודעות מערכת',
      href: '/app/admin/global/announcements',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-nexus-control',
      title: 'Admin · נקסוס · בקרה',
      href: '/app/admin/nexus/control',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-nexus-tenants',
      title: 'Admin · חשבונות SaaS',
      href: '/app/admin/tenants',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-nexus-intelligence',
      title: 'Admin · נקסוס · בינה',
      href: '/app/admin/nexus/intelligence',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-nexus-invitations',
      title: 'Admin · נקסוס · הזמנות',
      href: '/app/admin/nexus/invitations',
      category: 'אדמין ודשבורדים',
      icon: Link2,
    },
    {
      id: 'admin-nexus-announcements',
      title: 'Admin · נקסוס · הודעות מערכת',
      href: '/app/admin/nexus/announcements',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-social-overview',
      title: 'Admin · סושיאל · מבט על',
      href: '/app/admin/social?tab=overview',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-social-team',
      title: 'Admin · סושיאל · צוות',
      href: '/app/admin/social?tab=team',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-social-integrations',
      title: 'Admin · סושיאל · אינטגרציות',
      href: '/app/admin/social?tab=integrations',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-social-quotas',
      title: 'Admin · סושיאל · מכסות',
      href: '/app/admin/social?tab=quotas',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-social-automation',
      title: 'Admin · סושיאל · אוטומציות',
      href: '/app/admin/social?tab=automation',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-social-features',
      title: 'Admin · סושיאל · בקשות פיצ׳רים',
      href: '/app/admin/social?tab=features',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-social-updates',
      title: 'Admin · סושיאל · עדכוני מערכת',
      href: '/app/admin/social?tab=updates',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-social-advanced',
      title: 'Admin · סושיאל · ניהול מתקדם',
      href: '/app/admin/social?tab=advanced',
      category: 'אדמין ודשבורדים',
      icon: LayoutGrid,
    },
    {
      id: 'admin-system-control',
      title: 'Admin · System · בקרה',
      href: '/app/admin/system/control',
      category: 'אדמין ודשבורדים',
      icon: Shield,
    },
    {
      id: 'admin-system-announcements',
      title: 'Admin · System · הודעות מערכת',
      href: '/app/admin/system/announcements',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-client-support',
      title: 'Admin · Client · קריאות תמיכה',
      href: '/app/admin/client/support',
      category: 'אדמין ודשבורדים',
      icon: LifeBuoy,
    },
    {
      id: 'admin-client-features',
      title: 'Admin · Client · בקשות פיצ׳רים',
      href: '/app/admin/client/features',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-client-announcements',
      title: 'Admin · Client · הודעות מערכת',
      href: '/app/admin/client/announcements',
      category: 'אדמין ודשבורדים',
      icon: FileText,
    },
    {
      id: 'admin-landing-pricing',
      title: 'Admin · דף נחיתה · תמחור',
      href: '/app/admin/landing/pricing',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-payment-links',
      title: 'Admin · דף נחיתה · לינקים לתשלום',
      href: '/app/admin/landing/payment-links',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-partners',
      title: 'Admin · דף נחיתה · שותפים',
      href: '/app/admin/landing/partners',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-founder',
      title: 'Admin · דף נחיתה · מייסד',
      href: '/app/admin/landing/founder',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-logo',
      title: 'Admin · דף נחיתה · לוגו',
      href: '/app/admin/landing/logo',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-videos',
      title: 'Admin · דף נחיתה · וידאו',
      href: '/app/admin/landing/videos',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-package-videos',
      title: 'Admin · דף נחיתה · וידאו לחבילות',
      href: '/app/admin/landing/package-videos',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-branding',
      title: 'Admin · דף נחיתה · מיתוג',
      href: '/app/admin/landing/branding',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'admin-landing-announcements',
      title: 'Admin · דף נחיתה · הודעות מערכת',
      href: '/app/admin/landing/announcements',
      category: 'אדמין ודשבורדים',
      icon: Globe,
    },
    {
      id: 'payments-checkout',
      title: 'Checkout',
      href: '/subscribe/checkout',
      category: 'תשלומים',
      icon: Link2,
    },
    {
      id: 'payments-solo-system',
      title: 'Checkout · מודול בודד (System)',
      href: '/subscribe/checkout?package=solo&module=system&billing=monthly',
      category: 'תשלומים',
      icon: Link2,
    },
    {
      id: 'payments-package-closer',
      title: 'Checkout · חבילת מכירות',
      href: '/subscribe/checkout?package=the_closer&billing=monthly',
      category: 'תשלומים',
      icon: Link2,
    },
    {
      id: 'payments-package-authority',
      title: 'Checkout · חבילת שיווק ומיתוג',
      href: '/subscribe/checkout?package=the_authority&billing=monthly',
      category: 'תשלומים',
      icon: Link2,
    },
    {
      id: 'payments-package-operator',
      title: 'Checkout · חבילת תפעול ושטח',
      href: '/subscribe/checkout?package=the_operator&billing=monthly',
      category: 'תשלומים',
      icon: Link2,
    },
    {
      id: 'payments-package-empire',
      title: 'Checkout · הכל כלול',
      href: '/subscribe/checkout?package=the_empire&billing=monthly',
      category: 'תשלומים',
      icon: Link2,
    },
    {
      id: 'workspace-root',
      title: 'Workspace · בית (Redirect)',
      href: '/w/{orgSlug}',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspaces-index',
      title: 'Workspaces · בחירת סביבת עבודה',
      href: '/workspaces',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
    },
    {
      id: 'workspaces-new',
      title: 'Workspaces · יצירת סביבת עבודה',
      href: '/workspaces/new',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
    },
    {
      id: 'workspace-lobby',
      title: 'Workspace · Lobby',
      href: '/w/{orgSlug}/lobby',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-admin',
      title: 'Workspace · Admin',
      href: '/w/{orgSlug}/admin',
      category: 'מערכת (Workspace)',
      icon: Shield,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-client',
      title: 'Client',
      href: '/w/{orgSlug}/client',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-system',
      title: 'System OS',
      href: '/w/{orgSlug}/system',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-finance',
      title: 'Finance OS',
      href: '/w/{orgSlug}/finance',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-finance-overview',
      title: 'Finance · סקירה',
      href: '/w/{orgSlug}/finance/overview',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-finance-invoices',
      title: 'Finance · חשבוניות',
      href: '/w/{orgSlug}/finance/invoices',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-finance-expenses',
      title: 'Finance · הוצאות',
      href: '/w/{orgSlug}/finance/expenses',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-finance-me',
      title: 'Finance · פרופיל',
      href: '/w/{orgSlug}/finance/me',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-operations',
      title: 'Operations OS',
      href: '/w/{orgSlug}/operations',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-operations-work-orders',
      title: 'Operations · קריאות שירות',
      href: '/w/{orgSlug}/operations/work-orders',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-operations-map',
      title: 'Operations · מפה',
      href: '/w/{orgSlug}/operations/map',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-operations-inventory',
      title: 'Operations · מלאי',
      href: '/w/{orgSlug}/operations/inventory',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-nexus',
      title: 'Nexus',
      href: '/w/{orgSlug}/nexus',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-nexus-team',
      title: 'Nexus · צוות',
      href: '/w/{orgSlug}/nexus/team',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-nexus-tasks',
      title: 'Nexus · משימות',
      href: '/w/{orgSlug}/nexus/tasks',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-nexus-reports',
      title: 'Nexus · דוחות',
      href: '/w/{orgSlug}/nexus/reports',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-social',
      title: 'Social',
      href: '/w/{orgSlug}/social',
      category: 'מערכת (Workspace)',
      icon: Briefcase,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
    {
      id: 'workspace-social-admin-shabbat',
      title: 'Social · Admin · תצוגה מקדימה מצב שבת',
      href: '/w/{orgSlug}/social/admin/shabbat-preview',
      category: 'מערכת (Workspace)',
      icon: Shield,
      description: 'החלף {orgSlug} ב-slug של סביבת העבודה.',
    },
  ];
}

export default function LinksHubPageClient() {
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allLinks = useMemo(() => getLinks(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allLinks;
    return allLinks.filter((l) => {
      const hay = `${l.title} ${l.href} ${l.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allLinks, query]);

  const categories = useMemo(() => {
    const order: HubCategory[] = [
      'שיווק',
      'תשלומים',
      'תמיכה והדרכה',
      'Auth',
      'משפטי',
      'אדמין ודשבורדים',
      'מערכת (Workspace)',
    ];
    const map = new Map<HubCategory, HubLink[]>();
    for (const c of order) map.set(c, []);
    for (const l of filtered) {
      const list = map.get(l.category) || [];
      list.push(l);
      map.set(l.category, list);
    }
    return order
      .map((c) => ({ category: c, links: map.get(c) || [] }))
      .filter((x) => x.links.length > 0);
  }, [filtered]);

  const handleCopy = async (link: HubLink) => {
    const value = link.href.includes('{orgSlug}') ? link.href : toAbsoluteUrl(link.href);
    await copyText(value);
    setCopiedId(link.id);
    window.setTimeout(() => setCopiedId((cur) => (cur === link.id ? null : cur)), 1400);
  };

  const handleCopyAll = async () => {
    const text = filtered
      .map((l) => {
        const value = l.href.includes('{orgSlug}') ? l.href : toAbsoluteUrl(l.href);
        return `${l.title}: ${value}`;
      })
      .join('\n');

    if (!text) return;
    await copyText(text);
    setCopiedId('__all__');
    window.setTimeout(() => setCopiedId((cur) => (cur === '__all__' ? null : cur)), 1400);
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader
        title="מרכז קישורים ומשאבים"
        subtitle="Index מלא לשיווק, תמיכה, מערכת ואדמין"
        icon={Link2}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={handleCopyAll}>
              <Copy size={16} />
              <span>{copiedId === '__all__' ? 'הועתק!' : 'העתק הכל'}</span>
            </Button>
            <Link
              href="/app/admin/global/control"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              <Shield size={16} />
              חזרה
            </Link>
          </div>
        }
      />

      <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-slate-200/70 shadow-xl p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <Search size={20} />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Smart Search</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש לפי שם, URL, או תיאור…"
              className="mt-2 w-full h-12 px-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="mt-4 text-xs font-bold text-slate-500">מציג {filtered.length} קישורים</div>
      </div>

      <div className="space-y-6">
        {categories.map((group) => {
          const CategoryIcon = iconForCategory(group.category);
          return (
            <div key={group.category} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                    <CategoryIcon size={18} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-900">{group.category}</div>
                    <div className="text-xs font-bold text-slate-500">{group.links.length} פריטים</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.links.map((l) => {
                  const Icon = l.icon;
                  const displayHref = l.href.includes('{orgSlug}') ? l.href : toAbsoluteUrl(l.href);
                  return (
                    <div
                      key={l.id}
                      className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-slate-900 truncate">{l.title}</div>
                          <div className="mt-1 text-xs font-bold text-slate-500 truncate dir-ltr">{displayHref}</div>
                          {l.description ? (
                            <div className="mt-2 text-xs font-bold text-slate-500">{l.description}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          className="flex-1 gap-2"
                          variant="outline"
                          onClick={() => handleCopy(l)}
                        >
                          <Copy size={16} />
                          <span>{copiedId === l.id ? 'הועתק!' : 'העתק'}</span>
                        </Button>

                        {l.href.startsWith('http://') || l.href.startsWith('https://') ? (
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center w-12 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            title="פתח בטאב חדש"
                          >
                            <ExternalLink size={16} />
                          </a>
                        ) : l.href.includes('{orgSlug}') ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-12 h-11 rounded-2xl"
                            title="העתק, ואז החלף orgSlug"
                            onClick={() => handleCopy(l)}
                          >
                            <ExternalLink size={16} />
                          </Button>
                        ) : (
                          <Link
                            href={l.href}
                            target="_blank"
                            className="inline-flex items-center justify-center w-12 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            title="פתח בטאב חדש"
                          >
                            <ExternalLink size={16} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {categories.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <div className="text-lg font-black text-slate-900">לא נמצאו תוצאות</div>
            <div className="text-sm font-bold text-slate-600 mt-2">נסה לחפש מונח אחר.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

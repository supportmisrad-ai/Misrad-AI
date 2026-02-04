export type HubCategory =
  | 'שיווק'
  | 'תמיכה והדרכה'
  | 'משפטי'
  | 'Auth'
  | 'אדמין ודשבורדים'
  | 'מערכת (Workspace)'
  | 'תשלומים';

export type HubLink = {
  id: string;
  title: string;
  href: string;
  category: HubCategory;
  description?: string;
};

export const LINKS_HUB: HubLink[] = [
  { id: 'm-social', title: 'Social · דף נחיתה', href: '/social', category: 'שיווק' },
  { id: 'm-pricing', title: 'Pricing · מחירון', href: '/pricing', category: 'שיווק' },
  { id: 'm-about', title: 'אודות', href: '/about', category: 'שיווק' },
  { id: 'm-accessibility', title: 'הצהרת נגישות', href: '/accessibility', category: 'שיווק' },
  { id: 'm-system', title: 'System · דף שיווק', href: '/system', category: 'שיווק' },
  { id: 'm-client', title: 'Client · דף שיווק', href: '/client', category: 'שיווק' },
  { id: 'm-nexus', title: 'Nexus · דף שיווק', href: '/nexus', category: 'שיווק' },
  { id: 'm-finance', title: 'Finance · דף שיווק', href: '/finance-landing', category: 'שיווק' },
  { id: 'm-operations', title: 'Operations · דף שיווק', href: '/operations', category: 'שיווק' },
  { id: 'm-the-operator', title: 'Landing · חבילת תפעול ושטח', href: '/the-operator', category: 'שיווק' },
  { id: 'm-the-closer', title: 'Landing · חבילת מכירות', href: '/the-closer', category: 'שיווק' },
  { id: 'm-the-authority', title: 'Landing · חבילת שיווק ומיתוג', href: '/the-authority', category: 'שיווק' },
  { id: 'm-the-empire', title: 'Landing · הכל כלול', href: '/the-empire', category: 'שיווק' },
  { id: 'm-solo', title: 'Landing · מודול בודד', href: '/solo', category: 'שיווק' },
  { id: 'm-contact', title: 'צור קשר', href: '/contact', category: 'שיווק' },
  { id: 'm-portal', title: 'Portal', href: '/portal', category: 'שיווק' },
  { id: 'm-chat', title: 'Chat', href: '/chat', category: 'שיווק' },
  { id: 'm-maintenance', title: 'Maintenance', href: '/maintenance', category: 'שיווק' },
  { id: 'm-shabbat', title: 'מצב שבת', href: '/shabbat', category: 'שיווק' },

  { id: 'legal-terms', title: 'תנאי שימוש', href: '/legal/terms', category: 'משפטי' },
  { id: 'legal-privacy', title: 'מדיניות פרטיות', href: '/legal/privacy', category: 'משפטי' },

  { id: 'auth-login', title: 'Login', href: '/login', category: 'Auth' },
  { id: 'auth-signup', title: 'Sign Up', href: '/login?mode=sign-up', category: 'Auth' },

  { id: 'support-home', title: 'מרכז הידע (תמיכה)', href: '/support', category: 'תמיכה והדרכה' },
  { id: 'support-form', title: 'טופס תמיכה', href: '/support', category: 'תמיכה והדרכה' },

  { id: 'admin-links', title: 'Admin · מרכז קישורים', href: '/app/admin/global/links', category: 'אדמין ודשבורדים' },
  { id: 'admin-help-videos', title: 'Admin · ניהול סרטוני הדרכה', href: '/app/admin/global/help-videos', category: 'אדמין ודשבורדים' },

  { id: 'checkout-solo-system', title: 'Checkout · מודול בודד (System)', href: '/subscribe/checkout?package=solo&module=system&billing=monthly', category: 'תשלומים' },
  { id: 'checkout-the-closer', title: 'Checkout · חבילת מכירות', href: '/subscribe/checkout?package=the_closer&billing=monthly', category: 'תשלומים' },
  { id: 'checkout-the-authority', title: 'Checkout · חבילת שיווק ומיתוג', href: '/subscribe/checkout?package=the_authority&billing=monthly', category: 'תשלומים' },
  { id: 'checkout-the-operator', title: 'Checkout · חבילת תפעול ושטח', href: '/subscribe/checkout?package=the_operator&billing=monthly', category: 'תשלומים' },
  { id: 'checkout-the-empire', title: 'Checkout · הכל כלול', href: '/subscribe/checkout?package=the_empire&billing=monthly', category: 'תשלומים' },
];

export function getLinksHub(): HubLink[] {
  return LINKS_HUB;
}

export function getLinksHubByCategory(category: HubCategory): HubLink[] {
  return LINKS_HUB.filter((l) => l.category === category);
}

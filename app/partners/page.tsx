import { Metadata } from 'next';
import PartnersLandingClient from './PartnersLandingClient';

export const metadata: Metadata = {
  title: 'הצטרף כשותף | MISRAD AI',
  description: 'הרוויחו עמלות על כל לקוח שתביאו ל-MISRAD AI. 10% עמלה + בונוסים + ערכת שיווק מוכנה.',
  robots: 'noindex, nofollow', // לא מופיע בגוגל
};

export default function PartnersPage() {
  return <PartnersLandingClient />;
}

import { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'לוח בקרה - שותף | MISRAD AI',
  description: 'עקוב אחרי הביצועים והעמלות שלך כשותף MISRAD AI',
  robots: 'noindex, nofollow',
};

export default function DashboardPage() {
  return <DashboardClient />;
}

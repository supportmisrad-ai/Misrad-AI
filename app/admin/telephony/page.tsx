import type { Metadata } from 'next';
import AdminTelephonyDashboard from './AdminTelephonyDashboard';

export const metadata: Metadata = {
  title: 'ניהול טלפוניה | Voicenter Reseller',
  description: 'ניהול תת-חשבונות טלפוניה, שלוחות, שימוש וחיוב',
};

export default function TelephonyAdminPage() {
  return <AdminTelephonyDashboard />;
}

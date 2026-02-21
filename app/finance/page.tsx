import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function FinanceRootPage() {
  redirect('/finance/invoices');
}

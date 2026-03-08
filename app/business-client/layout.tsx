import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פורטל לקוח עסקי | Misrad-AI',
  description: 'צפייה בחשבוניות ותשלומים',
};

export default function BusinessClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {children}
    </div>
  );
}

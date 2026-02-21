import { redirect } from 'next/navigation';
import Link from 'next/link';
import { provisionCurrentUserWorkspaceAction } from '@/app/actions/users';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function NewWorkspacePage() {
  const res = await provisionCurrentUserWorkspaceAction();

  if (res.success && res.organizationKey) {
    redirect('/workspaces/onboarding');
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <div className="relative mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="font-black text-slate-900 text-xl">לא הצלחנו ליצור עסק חדש</div>
          <div className="text-sm text-slate-600 mt-2">{res.error || 'אנא נסה שוב בעוד רגע.'}</div>
          <div className="mt-6 flex gap-3">
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-white font-black shadow-md hover:bg-slate-800 transition"
            >
              נסה שוב
            </Link>
            <Link
              href="/workspaces"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-6 py-3 text-slate-800 font-black hover:bg-slate-200 transition"
            >
              חזרה לרשימת העסקים
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

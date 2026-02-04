import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getContentByKey } from '@/app/actions/site-content';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { DEFAULT_REFUND_POLICY_MARKDOWN } from '@/lib/legal-defaults';

export const dynamic = 'force-dynamic';

export default async function RefundPolicyPage() {
  const result = await getContentByKey('legal', 'documents', 'refund_policy_markdown');
  const markdownFromCms = typeof result.data === 'string' ? result.data : '';
  const markdown = markdownFromCms.trim() ? markdownFromCms : DEFAULT_REFUND_POLICY_MARKDOWN;
  const renderedMarkdown = String(markdown).replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('he-IL'));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section>
          <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>מדיניות החזרים</span>
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900">
              החזרים וזיכויים
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
              מדיניות ברורה והוגנת לניהול החזרים, זיכויים וביטולי מנוי במערכת Misrad AI
            </p>
            <div className="mt-8 rounded-xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
              <MarkdownRenderer content={renderedMarkdown} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

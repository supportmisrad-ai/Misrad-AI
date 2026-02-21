import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getContentByKey } from '@/app/actions/site-content';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { DEFAULT_TERMS_MARKDOWN } from '@/lib/legal-defaults';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function TermsPage() {
  const result = await getContentByKey('legal', 'documents', 'terms_markdown');
  const markdownFromCms = typeof result.data === 'string' ? result.data : '';
  const markdown = markdownFromCms.trim() ? markdownFromCms : DEFAULT_TERMS_MARKDOWN;
  const renderedMarkdown = String(markdown).replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('he-IL'));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section>
          <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>תנאי שימוש</span>
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900">
              תנאי שימוש
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
              כללי השימוש, הזכויות והחובות בעת שימוש בפלטפורמת Misrad AI
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

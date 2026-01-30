import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getContentByKey } from '@/app/actions/site-content';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { DEFAULT_PRIVACY_MARKDOWN } from '@/lib/legal-defaults';

export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const result = await getContentByKey('legal', 'documents', 'privacy_markdown');
  const markdownFromCms = typeof result.data === 'string' ? result.data : '';
  const markdown = markdownFromCms.trim() ? markdownFromCms : DEFAULT_PRIVACY_MARKDOWN;
  const renderedMarkdown = String(markdown).replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('he-IL'));

  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-slate-200/40 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>פרטיות</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-black leading-tight">מדיניות פרטיות</h1>
            <div className="mt-10 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
              <MarkdownRenderer content={renderedMarkdown} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

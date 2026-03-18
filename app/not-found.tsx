import Link from 'next/link';
import { Home, Zap, ChevronLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      {/* Subtle glow effect in the background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
        <div className="space-y-4">
          <h1 className="text-8xl md:text-9xl font-black text-slate-200 tracking-tighter select-none">
            404
          </h1>
          
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              הגעת לנקודה עיוורת.
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
              הדף שחיפשת לא קיים. אבל בניגוד לדף הזה — בארגון שלך שום דבר לא אמור ללכת לאיבוד.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm max-w-lg mx-auto text-right hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100/50">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-900">ניהול ללא שטחים מתים</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                מערכת MISRAD AI מזהה בזמן אמת עומסים, חריגות ולקוחות בסיכון, כדי ששום פרט לא יפול בין הכיסאות. שליטה מוחלטת במידע.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto shadow-sm"
          >
            <Home className="w-4 h-4" />
            חזרה לעמוד הראשי
          </Link>

          <Link 
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 w-full sm:w-auto shadow-sm"
          >
            איך AI מנהל את הארגון?
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="pt-10 border-t border-slate-200/60 mt-12">
          <p className="text-sm text-slate-500 mb-5 font-medium">ניווט מהיר למודולים:</p>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {['Nexus OS', 'Social', 'Client', 'Finance OS', 'Operations OS'].map((module) => (
              <Link 
                key={module}
                href="/me" 
                className="px-4 py-2 bg-white border border-slate-200/80 rounded-lg text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50 hover:shadow-sm transition-all"
              >
                {module}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

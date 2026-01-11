'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';

export default function LegalView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-20" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => {
            if (!isAuthenticated) {
              router.push('/');
              return;
            }
            const basePath = getSocialBasePath(pathname);
            router.push(joinPath(basePath, '/dashboard'));
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 font-bold transition-colors"
        >
          <ArrowLeft size={20} />
          חזרה
        </button>

        <div className="bg-white rounded-[32px] p-10 md:p-16 shadow-xl">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">תנאי שימוש ומדיניות פרטיות</h1>
          
          <div className="prose prose-slate max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-black text-slate-900 mb-4">1. תנאי שימוש</h2>
              <p className="text-slate-600 font-bold leading-relaxed mb-4">
                ברוכים הבאים ל-Social. על ידי שימוש בפלטפורמה שלנו, אתם מסכימים לתנאים הבאים:
              </p>
              <ul className="list-disc list-inside text-slate-600 font-bold space-y-2">
                <li>השימוש בפלטפורמה מיועד למטרות עסקיות בלבד</li>
                <li>אחריות על תוכן שפורסם היא על המשתמש</li>
                <li>שמירה על סודיות פרטי הגישה</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-black text-slate-900 mb-4">2. מדיניות פרטיות</h2>
              <p className="text-slate-600 font-bold leading-relaxed mb-4">
                אנו מחויבים להגנה על פרטיותכם. המידע שאתם מספקים משמש אך ורק למטרות שירות.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">3. צור קשר</h2>
              <p className="text-slate-600 font-bold leading-relaxed">
                לשאלות בנוגע לתנאי השימוש, אנא צרו קשר עם צוות התמיכה שלנו.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}



import React from 'react';
import { ArrowRight, Shield, Lock, FileText, CheckCircle2, Users, MapPin, Globe, Mail, Calendar, Briefcase, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- Shared Layout ---
const PublicLayout: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => {
    const router = useRouter();
    
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30" dir="rtl">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/login')}>
                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <div className="w-4 h-4 bg-white rounded-full"></div>
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">Misrad OS</span>
                    </div>
                    <button 
                        onClick={() => router.push('/login')}
                        className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                    >
                        <ArrowRight size={16} className="rotate-180" /> חזרה למערכת
                    </button>
                </div>
            </nav>

            {/* Header */}
            <header className="pt-40 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">{title}</h1>
                    {subtitle && <p className="text-xl text-slate-400 max-w-2xl mx-auto">{subtitle}</p>}
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 pb-32 relative z-10">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-12 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} MISRAD. All rights reserved.</p>
            </footer>
        </div>
    );
};

// --- LEGAL PAGES ---

export const PrivacyView: React.FC = () => (
    <PublicLayout title="מדיניות פרטיות" subtitle="השקיפות היא ערך עליון עבורנו. הנה האופן בו אנו שומרים על המידע שלך.">
        <div className="space-y-12 text-slate-300 leading-relaxed">
            <section className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Shield className="text-emerald-500" /> איסוף מידע</h3>
                <p className="mb-4">אנו אוספים מידע שאתה מספק לנו ישירות, כגון בעת יצירת חשבון, עדכון הפרופיל שלך, או שימוש בפיצ'רים של ה-CRM והמשימות.</p>
                <ul className="list-disc list-inside space-y-2 text-slate-400">
                    <li>פרטי קשר (שם, אימייל, טלפון)</li>
                    <li>מידע עסקי (שם החברה, תפקיד)</li>
                    <li>תוכן שנוצר במערכת (משימות, לקוחות, קבצים)</li>
                </ul>
            </section>

            <section>
                <h3 className="text-xl font-bold text-white mb-4">שימוש במידע</h3>
                <p>אנו משתמשים במידע אך ורק לצורך מתן השירות, שיפור המערכת ואבטחת החשבון שלך. המידע שלך לעולם לא יימכר לצד שלישי למטרות שיווקיות.</p>
            </section>

            <section>
                <h3 className="text-xl font-bold text-white mb-4">אבטחת מידע</h3>
                <p>Misrad OS משתמשת בתקני ההצפנה המתקדמים ביותר (TLS 1.3, AES-256) כדי להגן על המידע שלך במנוחה ובתנועה. השרתים שלנו ממוקמים במתקנים מאובטחים העומדים בתקני ISO 27001.</p>
            </section>
        </div>
    </PublicLayout>
);

export const TermsView: React.FC = () => (
    <PublicLayout title="תנאי שימוש" subtitle="ההסכם המשפטי בינך לבין Misrad OS.">
        <div className="space-y-8 text-slate-300">
            <h3 className="text-xl font-bold text-white">1. הסכמה לתנאים</h3>
            <p>בעת השימוש בתוכנת Misrad OS, אתה מסכים לכל התנאים המפורטים במסמך זה. אם אינך מסכים, אנא הפסק את השימוש במערכת.</p>

            <h3 className="text-xl font-bold text-white">2. רישיון שימוש</h3>
            <p>אנו מעניקים לך רישיון מוגבל, לא בלעדי ובלתי ניתן להעברה להשתמש בתוכנה לצרכים עסקיים פנימיים, בהתאם לחבילה שבחרת.</p>

            <h3 className="text-xl font-bold text-white">3. אחריות המשתמש</h3>
            <p>אתה אחראי לשמור על סודיות פרטי הגישה לחשבונך ולכל הפעילות המתרחשת תחת החשבון שלך.</p>
        </div>
    </PublicLayout>
);

export const SecurityView: React.FC = () => (
    <PublicLayout title="אבטחת מידע" subtitle="הגנה ברמה בנקאית עבור העסק שלך.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
                { title: 'הצפנה מקצה לקצה', desc: 'כל הנתונים מוצפנים במעבר (TLS) ובמנוחה (AES-256).', icon: Lock },
                { title: 'גיבויים אוטומטיים', desc: 'המידע שלך מגובה בזמן אמת לשרתים יתירים במספר מיקומים גיאוגרפיים.', icon: FileText },
                { title: 'בקרת גישה (RBAC)', desc: 'מערכת הרשאות מתקדמת המאפשרת לך לשלוט בדיוק מי רואה מה.', icon: Users },
                { title: 'תאימות לתקנים', desc: 'התשתית שלנו עומדת בתקני GDPR, SOC2 ו-ISO 27001.', icon: CheckCircle2 },
            ].map((item, i) => (
                <div key={i} className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 hover:border-indigo-500/50 transition-colors">
                    <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                        <item.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400">{item.desc}</p>
                </div>
            ))}
        </div>
        
        <div className="mt-12 bg-indigo-900/20 border border-indigo-500/30 p-8 rounded-3xl text-center">
            <h3 className="text-2xl font-bold text-white mb-4">דיווח על חולשת אבטחה</h3>
            <p className="text-slate-300 mb-6">אנו מפעילים תוכנית Bug Bounty. אם מצאת בעיה, נשמח לשמוע.</p>
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors">
                דווח לצוות האבטחה
            </button>
        </div>
    </PublicLayout>
);

// --- COMPANY PAGES ---

export const AboutView: React.FC = () => (
    <PublicLayout title="אודות MISRAD" subtitle="אנחנו בונים את מערכת ההפעלה לעסקים של המחר.">
        <div className="space-y-16">
            <section className="text-center max-w-2xl mx-auto">
                <p className="text-xl text-slate-300 leading-relaxed">
                    הקמנו את MISRAD מתוך תסכול. תסכול מכך שעסקים נאלצים להשתמש ב-10 תוכנות שונות שלא מדברות אחת עם השנייה.
                    <br/><br/>
                    המשימה שלנו היא פשוטה: <span className="text-white font-bold">לאחד את הכל.</span>
                </p>
            </section>
        </div>
    </PublicLayout>
);

export const ContactView: React.FC = () => (
    <PublicLayout title="צור קשר" subtitle="יש לך שאלה? אנחנו כאן לכל דבר.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">המשרדים שלנו</h3>
                        <p className="text-slate-400">שדרות רוטשילד 22, תל אביב<br/>קומה 18</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">אימייל</h3>
                        <p className="text-slate-400">support@nexus-os.co<br/>sales@nexus-os.co</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">רשתות חברתיות</h3>
                        <div className="flex gap-4 mt-2">
                            <a href="#" className="text-slate-400 hover:text-white">LinkedIn</a>
                            <a href="#" className="text-slate-400 hover:text-white">Twitter</a>
                            <a href="#" className="text-slate-400 hover:text-white">Instagram</a>
                        </div>
                    </div>
                </div>
            </div>

            <form className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4" onSubmit={(e) => { e.preventDefault(); }}>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">שם מלא</label>
                    <input className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" placeholder="הזן שם" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">אימייל</label>
                    <input type="email" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-left dir-ltr" placeholder="הזן אימייל" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">הודעה</label>
                    <textarea className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 h-32 resize-none" placeholder="איך נוכל לעזור?" />
                </div>
                <button disabled className="w-full bg-white text-black font-bold py-4 rounded-xl opacity-60 cursor-not-allowed">
                    שלח הודעה
                </button>
            </form>
        </div>
    </PublicLayout>
);

export const BlogView: React.FC = () => (
    <PublicLayout title="הבלוג של MISRAD" subtitle="תובנות על ניהול, פרודוקטיביות וטכנולוגיה.">
        <div className="bg-slate-900/50 p-10 rounded-3xl border border-slate-800 text-center text-slate-400">
            אין מאמרים להצגה.
        </div>
    </PublicLayout>
);

export const CareersView: React.FC = () => (
    <PublicLayout title="קריירה ב-MISRAD" subtitle="בואו לבנות איתנו את העתיד.">
        <div className="bg-slate-900/50 p-10 rounded-3xl border border-slate-800 text-center text-slate-400">
            אין משרות פתוחות כרגע.
        </div>
        <div className="mt-12 text-center bg-indigo-900/20 border border-indigo-500/20 p-10 rounded-3xl">
            <h3 className="text-2xl font-bold text-white mb-2">לא מצאתם את המשרה המתאימה?</h3>
            <p className="text-slate-400 mb-6">אנחנו תמיד מחפשים טאלנטים. שלחו לנו קורות חיים ונסתכל.</p>
            <button className="text-indigo-400 font-bold hover:text-indigo-300 underline">jobs@nexus-os.co</button>
        </div>
    </PublicLayout>
);

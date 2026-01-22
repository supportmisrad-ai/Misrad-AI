'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
  Play,
  X,
  Video,
  Activity,
  Quote,
  Star,
  Users,
  TrendingUp,
  Clock,
  MessageSquare,
  Shield,
  Sparkles,
  Target,
  Zap,
  Award,
  Calendar,
  Moon,
  Sun,
  ShieldCheck,
  Rocket,
  ChevronDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { useLandingContent } from '@/components/social/landing/useLandingContent';

export default function LandingPage() {
  const router = useRouter();
  const { heroTitle, heroSubtitle, features, testimonials, isLoading } = useLandingContent();
  const [demoStep, setDemoStep] = useState(0);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100); // percentage
  const [highContrast, setHighContrast] = useState(false);

  // Scroll to top on mount to ensure Hero section is visible
  useEffect(() => {
    // Force scroll to top immediately
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Also try after a short delay to ensure it works
    const timeout = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleGetStarted = () => {
    router.push('/sign-in');
  };

  const handleGoToLegal = () => {
    // TODO: Create legal page route
    // router.push('/legal');
  };

  // Apply accessibility styles
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSize}%`;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    return () => {
      root.style.fontSize = '';
      root.classList.remove('high-contrast');
    };
  }, [fontSize, highContrast]);

  return (
    <div className={`min-h-screen bg-[#fcfdfe] text-slate-900 overflow-x-hidden ${highContrast ? 'high-contrast' : ''}`} dir="rtl" style={{ fontSize: `${fontSize}%` }}>
      {/* Accessibility Button - Fixed */}
      <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-2">
        <button
          onClick={() => setAccessibilityOpen(!accessibilityOpen)}
          className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all"
          aria-label="נגישות"
        >
          <Shield size={24} />
        </button>
        {accessibilityOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-4 min-w-[200px] border-2 border-indigo-100"
          >
            <h3 className="font-black text-slate-900 mb-3 text-sm">נגישות</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">גודל טקסט</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-black"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-slate-700 w-12 text-center">{fontSize}%</span>
                  <button
                    onClick={() => setFontSize(Math.min(150, fontSize + 10))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-black"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`w-full px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  highContrast 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ניגודיות גבוהה {highContrast ? '✓' : ''}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">Social</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/pricing')} className="text-slate-500 font-black text-sm px-6 py-2 hover:bg-slate-50 rounded-xl transition-all">מחירון (החל מ-₪149)</button>
            <button onClick={handleGetStarted} className="text-slate-500 font-black text-sm px-6 py-2 hover:bg-slate-50 rounded-xl transition-all">התחברות</button>
            <button 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-[0_20px_40px_-12px_rgba(59,130,246,0.3)] hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-3">
                התחל בחינם <ChevronLeft size={24} />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-32 px-6 relative min-h-[80vh] flex items-center">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-10 text-right relative z-10"
          >
            <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100/50 text-blue-600 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest self-start shadow-sm">
              <Sparkles size={14} /> המערכת שמשנה את כללי המשחק
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.95]">
              {isLoading ? (
                <>
                  נהלו את <br /> הסושיאל <br /> 
                  <span className="text-blue-600 italic relative">
                    באפס מאמץ.
                  </span>
                </>
              ) : (
                heroTitle.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < heroTitle.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))
              )}
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 font-bold max-w-xl leading-relaxed">
              {isLoading ? 'שחררו את המחסומים. פוסטים ב-DNA של המותג בלחיצת כפתור, גבייה אוטומטית ופורטלים ממותגים ללקוחות - הכל במקום אחד, שקט ומאורגן.' : heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-6 rounded-2xl font-black text-xl shadow-[0_30px_60px_-15px_rgba(59,130,246,0.4)] flex items-center justify-center gap-4 hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-3">
                  התחל בחינם <ChevronLeft size={24} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              <div className="flex items-center gap-4 text-sm text-slate-500 font-bold">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <span>ללא כרטיס אשראי</span>
                <span>•</span>
                <span>14 ימים חינם</span>
                <span>•</span>
                <span>ביטול בכל עת</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2 }}
            className="relative"
          >
            <div className="bg-white rounded-[64px] p-6 shadow-[0_100px_140px_-50px_rgba(15,23,42,0.1)] relative z-10 border border-slate-100/50 overflow-hidden min-h-[450px]">
              <div className="bg-slate-50 rounded-[48px] overflow-hidden aspect-[4/3] relative p-8 flex flex-col items-center justify-center gap-8 border border-slate-200">
                <AnimatePresence mode="wait">
                  {demoStep === 0 && (
                    <motion.div 
                      key="input"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm"
                    >
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">שלב 1: הבריף</p>
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full mt-4" />
                    </motion.div>
                  )}
                  {demoStep === 1 && (
                    <motion.div 
                      key="process"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="flex flex-col items-center gap-6"
                    >
                      <Skeleton className="w-24 h-24 rounded-full" />
                      <p className="text-blue-400 font-black tracking-widest uppercase text-sm">Gemini מנתח DNA מותג...</p>
                    </motion.div>
                  )}
                  {demoStep === 2 && (
                    <motion.div 
                      key="output"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="w-full max-w-md bg-blue-600 p-8 rounded-[40px] shadow-2xl relative overflow-hidden"
                    >
                      <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-4">גרסת ה-AI מוכנה</p>
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full mt-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-blue-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Users, value: '500+', label: 'משתמשים פעילים', color: 'text-blue-600' },
              { icon: TrendingUp, value: '15,000+', label: 'פוסטים שנוצרו', color: 'text-purple-600' },
              { icon: Clock, value: '15 שעות', label: 'חיסכון ממוצע בשבוע', color: 'text-emerald-600' },
              { icon: Award, value: '98%', label: 'שיעור שביעות רצון', color: 'text-red-600' },
            ].map((stat, i) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center flex flex-col items-center gap-4"
                >
                  <div className={`w-16 h-16 ${stat.color} bg-white rounded-2xl flex items-center justify-center shadow-lg`}>
                    <IconComponent size={32} />
                  </div>
                  <div className="text-4xl md:text-5xl font-black text-slate-900">{stat.value}</div>
                  <div className="text-sm font-bold text-slate-500">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hebrew Calendar Feature Section */}
      <section className="py-40 px-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex flex-col gap-8"
            >
              <div className="flex items-center gap-3 bg-purple-100/50 border border-purple-200/50 text-purple-700 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest self-start shadow-sm">
                <Calendar size={14} /> יתרון תחרותי בלעדי
              </div>
              
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.95]">
                לוח שנה עברי <br />
                <span className="text-purple-600 italic">מובנה במערכת</span>
              </h2>

              <p className="text-xl md:text-2xl text-slate-600 font-bold leading-relaxed">
                המערכת היחידה בישראל עם לוח שנה עברי מלא ומדויק. תאריכים עבריים, חגים, צומות ושבתות - הכל מוצג אוטומטית בלוח השידורים שלכם.
              </p>

              <div className="flex flex-col gap-4 mt-4">
                {[
                  { icon: Calendar, text: 'תאריכים עבריים מדויקים עם אותיות עבריות (גימטריה)' },
                  { icon: Moon, text: 'חגים ומועדים - ראש השנה, יום כיפור, סוכות, פסח, שבועות, חנוכה, פורים ועוד' },
                  { icon: Sun, text: 'צומות - תשעה באב, יום כיפור, תענית אסתר ועוד' },
                  { icon: ShieldCheck, text: 'זיהוי אוטומטי של שבתות - המערכת לא תזמין פוסטים בשבת' },
                ].map((feature, i) => {
                  const IconComponent = feature.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-purple-100 shadow-sm"
                    >
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <IconComponent size={24} />
                      </div>
                      <p className="text-lg font-bold text-slate-700 leading-relaxed pt-2">{feature.text}</p>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-6 p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl text-white">
                <p className="text-lg font-black mb-2">למה זה חשוב?</p>
                <p className="text-purple-100 font-bold leading-relaxed">
                  בישראל, רוב הלקוחות מתכננים לפי הלוח העברי. עם Social, אתם יכולים לתזמן פוסטים לפי תאריכים עבריים, להימנע מפרסום בשבתות וחגים, ולנצל את המועדים היהודיים לקמפיינים רלוונטיים.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative"
            >
              <div className="bg-white rounded-[48px] p-8 shadow-2xl border-2 border-purple-100">
                <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-[32px] p-8 text-white">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black">לוח שידורים</h3>
                    <div className="px-4 py-2 bg-white/20 rounded-full text-xs font-black uppercase">לוח עברי פעיל</div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, i) => (
                      <div key={i} className="text-center text-sm font-black opacity-80">{day}</div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      { date: 'כ״ה', heb: 'כ״ה', holiday: null },
                      { date: 'כ״ו', heb: 'כ״ו', holiday: null },
                      { date: 'כ״ז', heb: 'כ״ז', holiday: null },
                      { date: 'כ״ח', heb: 'כ״ח', holiday: null },
                      { date: 'כ״ט', heb: 'כ״ט', holiday: null },
                      { date: 'א׳', heb: 'א׳', holiday: 'ראש חודש' },
                      { date: 'ש', heb: 'ש', holiday: 'שבת', isShabbat: true },
                    ].map((day, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-black ${
                          day.isShabbat 
                            ? 'bg-white/30 border-2 border-white/50' 
                            : day.holiday 
                            ? 'bg-yellow-400/30 border border-yellow-300/50' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span>{day.date}</span>
                        {day.holiday && (
                          <span className="text-[8px] mt-1 opacity-80">{day.holiday}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <span className="font-bold">חג / מועד</span>
                      <div className="w-3 h-3 bg-white/30 rounded-full border-2 border-white/50 ml-4"></div>
                      <span className="font-bold">שבת</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-40 px-6 bg-[#fcfdfe] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col gap-32">
          <div className="text-center flex flex-col gap-6 relative z-10">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">מרכז שליטה <br className="md:hidden" /> מבצעי אחד.</h2>
            <p className="text-slate-600 font-bold text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
              תחזירו לעצמכם את הזמן. Social לוקחת את כל ה"רעש" של ניהול לקוחות והופכת אותו למוצר טכנולוגי נקי ומדויק.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feat, i) => {
              const IconComponent = feat.icon || Rocket;
              return (
                <motion.div 
                  key={i} 
                  whileHover={{ y: -12 }}
                  className="bg-white p-12 rounded-[56px] border border-slate-100/50 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(15,23,42,0.12)] hover:border-blue-200/50 transition-all duration-500 flex flex-col gap-8 group"
                >
                  <div className={`w-16 h-16 ${feat.color || 'bg-blue-600'} text-white rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500`}>
                    <IconComponent size={32} />
                  </div>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{feat.title}</h3>
                    <p className="text-slate-600 font-bold text-lg leading-relaxed">{feat.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-40 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-24">
          <div className="text-center flex flex-col gap-6">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">מנהלי סוכנויות <br /> שכבר גדלים איתנו.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {testimonials.map((t, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-50 p-12 rounded-[56px] flex flex-col gap-10 group hover:bg-white transition-all duration-500 border border-slate-200 shadow-sm hover:shadow-md"
              >
                <Quote className="text-blue-600 group-hover:text-blue-700 transition-colors" size={48} />
                <p className="text-xl font-bold text-slate-700 leading-relaxed italic group-hover:text-slate-900 transition-colors">"{t.quote}"</p>
                <div className="mt-auto flex items-center gap-5 pt-8 border-t border-slate-200 transition-colors">
                  <img src={t.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <p className="font-black text-slate-900">{t.name}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-40 px-6 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col gap-6">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">שאלות נפוצות</h2>
            <p className="text-slate-600 font-bold text-xl">כל מה שרציתם לדעת על Social</p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                q: 'איך זה עובד?',
                a: 'שולחים לינק וואטסאפ ללקוח, הוא מזין את כל הפרטים (לוגו, DNA, פרטי תשלום), ואז המערכת יוצרת פוסטים אוטומטית ב-DNA של המותג. כל מה שצריך זה לאשר ולפרסם.'
              },
              {
                q: 'כמה זמן לוקח להקים לקוח חדש?',
                a: 'פחות מדקה. הלקוח מקבל לינק, מזין את הפרטים, ואתם מקבלים גישה מלאה לפורטל שלו. אין צורך בפגישות, אין צורך במיילים - הכל אוטומטי.'
              },
              {
                q: 'מה אם הלקוח לא משלם?',
                a: 'המערכת שולחת תזכורות אוטומטיות, ואם יש פיגור - הגישה לפורטל נחסמת אוטומטית. הכל מסונכרן עם מורנינג או חשבונית ירוקה, כך שאתם לא צריכים לרדוף אחרי כסף.'
              },
              {
                q: 'האם יש התחייבות?',
                a: 'לא. תוכלו לבטל בכל עת ללא עמלות. הניסיון החינם הוא ל-14 ימים, ואחרי זה תשלמו רק אם אתם מרוצים.'
              },
              {
                q: 'האם הפוסטים באמת נשמעים כמו המותג?',
                a: 'כן. המערכת משתמשת ב-Gemini 3 שמנתח את ה-DNA של המותג (טון, אוצר מילים, צבעים, אסטרטגיה) ויוצרת פוסטים שכל כך מדויקים שהלקוחות שלכם בטוחים שאתם כותבים כל מילה בעצמכם.'
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden hover:border-blue-200 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-6 flex items-center justify-between text-right gap-4 hover:bg-slate-50 transition-colors"
                >
                  <h3 className="text-xl font-black text-slate-900 flex-1">{faq.q}</h3>
                  <ChevronDown 
                    className={`text-slate-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} 
                    size={24} 
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="p-6 pt-0 text-slate-600 font-bold leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-40 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col gap-12">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-center gap-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest self-center shadow-lg">
              <Sparkles size={16} /> מוכן להתחיל?
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.95]">
              התחילו לגדול <br />
              <span className="italic">עכשיו.</span>
            </h2>

            <p className="text-xl md:text-2xl text-blue-100 font-bold max-w-2xl mx-auto leading-relaxed">
              הצטרפו ל-500+ סוכנויות שכבר משתמשות ב-Social כדי לנהל את הסושיאל שלהם בצורה חכמה ורווחית יותר.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                onClick={handleGetStarted}
                className="bg-white text-blue-600 px-12 py-6 rounded-[32px] font-black text-xl shadow-2xl flex items-center justify-center gap-4 hover:bg-blue-50 hover:scale-[1.02] active:scale-95 transition-all"
              >
                התחל ניסיון חינם <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => router.push('/pricing')}
                className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-12 py-6 rounded-[32px] font-black text-xl flex items-center justify-center gap-4 hover:bg-white/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                צפה במחירון (₪149) <ArrowRight size={24} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-white/80 text-sm font-bold pt-8">
              <div className="flex items-center gap-2">
                <Shield className="text-emerald-300" size={20} />
                <span>אבטחה מתקדמת</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-300" size={20} />
                <span>ללא התחייבות</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="text-emerald-300" size={20} />
                <span>תמיכה 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-32 px-6 border-t border-slate-100 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>
              <span className="font-black text-3xl tracking-tighter">Social</span>
            </div>
            <p className="text-slate-600 font-bold text-lg leading-relaxed">אנחנו כאן כדי להפוך את הסושיאל למקום רווחי, מאורגן ויצירתי יותר.</p>
          </div>
          <div className="mt-32 pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">
            <p>© 2025 SOCIAL ISRAEL. כל הזכויות שמורות.</p>
            <div className="flex gap-10">
              <span className="hover:text-slate-900 transition-colors">נוצר באהבה בתל אביב 💙</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


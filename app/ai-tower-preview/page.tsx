'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════
// AI Tower - Hidden Marketing Page
// דף שיווקי מוסתר למערכת ה-AI החכמה
// ═══════════════════════════════════════════════════════════════════

export default function AITowerMarketingPage() {
  const [activeSection, setActiveSection] = useState<'hero' | 'problem' | 'solution' | 'demo' | 'cta'>('hero');
  const [demoStep, setDemoStep] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-xl">
                🏛️
              </div>
              <span className="text-xl font-bold">MISRAD AI</span>
              <span className="hidden sm:inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                AI Tower Preview
              </span>
            </div>
            <a
              href="#contact"
              className="hidden rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 sm:inline-block"
            >
              בקש גישה מוקדמת
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                <span className="block">ה-AI שלך רואה</span>
                <span className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                  את כל הארגון
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mx-auto mt-6 max-w-2xl text-lg text-slate-400"
            >
              AI Tower מחבר בין כל המודולים שלך - CRM, Booking, Finance, Attendance - 
              ומספק תובנות אוטומטיות שמשנות את איך שאתה מנהל את העסק.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <button
                onClick={() => setActiveSection('demo')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:shadow-xl hover:shadow-amber-500/30"
              >
                <span>ראה את הדמו החי</span>
                <span>→</span>
              </button>
              <button
                onClick={() => setActiveSection('problem')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-slate-800"
              >
                למה זה שונה?
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-8 border-t border-slate-800 pt-8 sm:grid-cols-4"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white">40%</div>
                <div className="mt-1 text-sm text-slate-400">פחות קליקים</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">3x</div>
                <div className="mt-1 text-sm text-slate-400">מהירות תגובה</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">75%</div>
                <div className="mt-1 text-sm text-slate-400">דיוק חיזוי</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">6</div>
                <div className="mt-1 text-sm text-slate-400">חוקי AI פעילים</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="border-t border-slate-800 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              הבעיה: <span className="text-red-400">איים של מידע</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              כיום, המערכות שלך לא מדברות אחת עם השנייה. ה-CRM לא יודע מה קורה ב-Finance.
              ה-Booking לא רואה את העומס ב-Nexus. ואתה נתקע באמצע.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {[
              {
                icon: '🏝️',
                title: 'CRM מבודד',
                desc: 'לקוח חייב כסף אבל המערכת ממשיכה להציע לו שירותים חדשים',
              },
              {
                icon: '📅',
                title: 'Booking עיוור',
                desc: 'פוגשים לקוח בלי לדעת שהוא לא שילף עבור הפגישה הקודמת',
              },
              {
                icon: '👥',
                title: 'צוות מנותק',
                desc: 'עובד נכנס למשמרת עם 10 משימות בפיגור ואף אחד לא שם לב',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8"
              >
                <div className="mb-4 text-4xl">{item.icon}</div>
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section - AI Tower */}
      <section id="solution" className="border-t border-slate-800 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              הפתרון: <span className="text-amber-400">AI Tower</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              מגדל שמירה אחד שיושב מעל כל המודולים, מנתח את כל הנתונים בזמן אמת,
              ומציג לך רק את מה שחשוב באותו רגע.
            </p>
          </div>

          {/* How It Works */}
          <div className="mt-16 grid gap-8 lg:grid-cols-4">
            {[
              { step: '1', title: 'אירוע מתרחש', desc: 'משימה הסתיימה, חשבונית נוצרה, עובד נכנס' },
              { step: '2', title: 'AI מנתח', desc: 'ה-Watchtower Engine בודק 6 חוקים בו-זמנית' },
              { step: '3', title: 'תובנה נוצרת', desc: 'מזהה דפוסים ומייצר Action Card מותאם' },
              { step: '4', title: 'פעולה אוטומטית', desc: 'מציע פתרון או מבצע אותו ישירות' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-amber-500/50 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Action Cards Demo */}
          <div className="mt-20">
            <h3 className="text-center text-2xl font-bold text-white mb-8">דוגמאות לתובנות חכמות</h3>
            <div className="mx-auto max-w-2xl space-y-4">
              {[
                {
                  severity: 'critical',
                  title: '⚠️ סיכון נטישת לקוח',
                  desc: 'דני כהן לא פעיל כבר 14 ימים. היסטוריה: 5 פרויקטים, 12,000₪',
                  action: 'שלח הצעת חזרה עם 15% הנחה',
                },
                {
                  severity: 'high',
                  title: '💰 הזדמנות להוצאת חשבונית',
                  desc: 'פרויקט "אתר תדמית" הסתיים אתמול. ערך משוער: 8,500₪',
                  action: 'צור חשבונית אוטומטית',
                },
                {
                  severity: 'medium',
                  title: '🔥 עומס יתר על עובד',
                  desc: 'מיכל לוי נכנסה למשמרת עם 7 משימות בפיגור',
                  action: 'חלק 3 משימות לדניאל',
                },
                {
                  severity: 'low',
                  title: '📅 חלונות זמן פנויים',
                  desc: 'יום רביעי 15/3 - 3 פגישות בוטלו. זמן פנוי: 4 שעות',
                  action: 'שלח הצעות ללקוחות פוטנציאליים',
                },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-xl border p-4 ${
                    card.severity === 'critical'
                      ? 'border-red-500/30 bg-red-500/5'
                      : card.severity === 'high'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : card.severity === 'medium'
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-slate-700 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{card.title}</h4>
                      <p className="mt-1 text-sm text-slate-300">{card.desc}</p>
                      <button className="mt-3 inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20">
                        {card.action}
                      </button>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        card.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : card.severity === 'high'
                          ? 'bg-amber-500/20 text-amber-400'
                          : card.severity === 'medium'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {card.severity === 'critical' ? 'דחוף' : card.severity === 'high' ? 'גבוה' : card.severity === 'medium' ? 'בינוני' : 'מידע'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-slate-800 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            מה כלול ב-AI Tower
          </h2>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: '6 חוקי AI מובנים',
                desc: 'Churn Risk, Invoice Opportunity, Overload Alert, Late Payment, Booking Gap, Win Back',
                icon: '🧠',
              },
              {
                title: 'Event Bus מאוחד',
                desc: 'כל האירועים מכל המודולים זורמים למערכת אחת מרכזית',
                icon: '🚌',
              },
              {
                title: 'Action Cards',
                desc: 'תובנות מוצגות בצורה של כרטיסי פעולה עם כפתור ביצוע מיידי',
                icon: '💳',
              },
              {
                title: 'Auto-Pilot Mode',
                desc: 'פעולות שגרתיות מתבצעות אוטומטית ללא התערבות אנושית',
                icon: '🤖',
              },
              {
                title: 'Contextual Sidebar',
                desc: 'מידע רלוונטי ממודולים אחרים מופיע בכל עמוד',
                icon: '📊',
              },
              {
                title: 'Real-time Processing',
                desc: 'אירועים מעובדים תוך מילישניות, ללא השפעה על ביצועים',
                icon: '⚡',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-800/50"
              >
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="border-t border-slate-800 py-20 lg:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            מוכן להפוך את הארגון שלך לחכם?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            AI Tower נמצא כרגע בשלב בטא סגור. 
            בקש גישה מוקדמת והיה בין הראשונים לחוות את העתיד של ניהול עסקים.
          </p>

          <div className="mt-10">
            <form className="mx-auto max-w-md space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="האימייל שלך"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="שם החברה"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:shadow-xl"
              >
                בקש גישה מוקדמת
              </button>
            </form>
            <p className="mt-4 text-sm text-slate-500">
              * הגישה מוגבלת ל-50 ארגונים בלבד בשלב הבטא
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>© 2026 MISRAD AI. כל הזכויות שמורות.</p>
          <p className="mt-2">מערכת AI Tower - גרסת תצוגה מקדימה</p>
        </div>
      </footer>
    </div>
  );
}

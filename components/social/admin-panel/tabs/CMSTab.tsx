'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, CreditCard, MessageSquare } from 'lucide-react';
import { bulkUpdateSiteContent, seedDefaultLegalDocuments } from '@/app/actions/admin-site-content';

type SiteContentPage = 'landing' | 'pricing' | 'legal';

type SiteContentRow = {
  key: string;
  content: unknown;
};

type SiteContentByPage = Record<SiteContentPage, SiteContentRow[]>;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function coerceRows(value: unknown): SiteContentRow[] {
  if (!Array.isArray(value)) return [];
  const out: SiteContentRow[] = [];
  for (const item of value) {
    const obj = asObject(item);
    const key = obj?.key;
    if (typeof key !== 'string' || !key) continue;
    out.push({ key, content: obj?.content });
  }
  return out;
}

function coerceSiteContent(value: unknown): SiteContentByPage {
  const obj = asObject(value) ?? {};
  return {
    landing: coerceRows(obj.landing),
    pricing: coerceRows(obj.pricing),
    legal: coerceRows(obj.legal),
  };
}

function getText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

interface CMSTabProps {
  siteContent: unknown;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function CMSTab({ siteContent, onRefresh, addToast }: CMSTabProps) {
  const contentByPage = useMemo(() => coerceSiteContent(siteContent), [siteContent]);

  const getContentValue = (page: 'landing' | 'pricing' | 'legal', key: string) => {
    return contentByPage[page]?.find((c) => c.key === key)?.content;
  };

  return (
    <motion.div key="cms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">תוכן האתר</h3>
            <p className="text-sm text-slate-600">ערוך את תוכן דף הנחיתה, המחירון וכל דפי האתר</p>
          </div>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-8">
            {/* Landing Page Content */}
            <div className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100">
              <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <FileText className="text-indigo-600" size={24} />
                דף נחיתה (Landing Page)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">כותרת ראשית (Hero Title)</label>
                  <input
                    type="text"
                    defaultValue={getText(getContentValue('landing', 'hero_title'), 'נהלו את הסושיאל באפס מאמץ.')}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'landing',
                        section: 'hero',
                        key: 'hero_title',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('תוכן עודכן', 'success');
                        onRefresh();
                      }
                    }}
                    className="w-full p-4 bg-white border border-indigo-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">תת-כותרת (Hero Subtitle)</label>
                  <textarea
                    defaultValue={getText(
                      getContentValue('landing', 'hero_subtitle'),
                      'שחררו את המחסומים. פוסטים ב-DNA של המותג בלחיצת כפתור.'
                    )}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'landing',
                        section: 'hero',
                        key: 'hero_subtitle',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('תוכן עודכן', 'success');
                        onRefresh();
                      }
                    }}
                    rows={3}
                    className="w-full p-4 bg-white border border-indigo-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400 resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-2">תכונות (Features) - JSON</label>
                  <textarea
                    defaultValue={JSON.stringify(getContentValue('landing', 'features') || [
                      { title: 'הקמת לקוח ב-60 שניות', desc: 'שלחו לינק וואטסאפ ללקוח, והוא כבר יזין הכל.', icon: 'Rocket' },
                      { title: 'The Machine ✨', desc: 'Gemini 3 בונה עבורכם פוסטים בטון המדויק של המותג.', icon: 'Zap' },
                      { title: 'גבייה ללא מגע אדם', desc: 'תזכורות אוטומטיות, חסימת גישה בפיגור.', icon: 'ShieldCheck' },
                    ], null, 2)}
                    onBlur={async (e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        const result = await bulkUpdateSiteContent([{
                          page: 'landing',
                          section: 'features',
                          key: 'features',
                          content: parsed,
                        }]);
                        if (result.success) {
                          addToast('תוכן עודכן', 'success');
                          onRefresh();
                        }
                      } catch {
                        addToast('JSON לא תקין', 'error');
                      }
                    }}
                    rows={8}
                    className="w-full p-4 bg-white border border-indigo-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-indigo-400 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Page Content */}
            <div className="bg-purple-50/50 p-8 rounded-3xl border border-purple-100">
              <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <CreditCard className="text-purple-600" size={24} />
                דף מחירון (Pricing Page)
              </h4>
              
              {/* Hero Section */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">כותרת ראשית</label>
                  <input
                    type="text"
                    defaultValue={getText(getContentValue('pricing', 'hero_title'), 'בחרו את החבילה המתאימה')}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'pricing',
                        section: 'hero',
                        key: 'hero_title',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('כותרת עודכנה', 'success');
                        onRefresh();
                      }
                    }}
                    className="w-full p-4 bg-white border border-purple-200 rounded-xl text-slate-900 outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">תת-כותרת</label>
                  <textarea
                    defaultValue={getText(
                      getContentValue('pricing', 'hero_subtitle'),
                      'ללא התחייבות. ביטול בכל עת. התחילו עם ניסיון חינם.'
                    )}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'pricing',
                        section: 'hero',
                        key: 'hero_subtitle',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('תת-כותרת עודכנה', 'success');
                        onRefresh();
                      }
                    }}
                    rows={2}
                    className="w-full p-4 bg-white border border-purple-200 rounded-xl text-slate-900 outline-none focus:border-purple-400 resize-none"
                  />
                </div>
              </div>

              {/* Plans */}
              <div className="space-y-6">
                {['starter', 'pro', 'agency'].map((plan) => {
                  const defaultPlanName = plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Professional' : 'Agency';
                  const defaultPlanDesc = plan === 'starter' ? '2 פוסטים בשבוע' : plan === 'pro' ? '3 פוסטים + AI' : 'ניהול מלא';
                  const defaultPlanFeatures =
                    plan === 'starter'
                      ? ['2 פוסטים בשבוע', 'גישה לפורטל', 'תמיכה במייל']
                      : plan === 'pro'
                        ? ['3 פוסטים בשבוע', 'The Machine ✨', 'גבייה אוטומטית', 'תמיכה עדיפות']
                        : ['פוסטים ללא הגבלה', 'The Machine ✨', 'גבייה אוטומטית', 'ניהול קמפיינים', 'תמיכה 24/7'];

                  const planName = getText(getContentValue('pricing', `${plan}_name`), defaultPlanName);
                  const planDesc = getText(getContentValue('pricing', `${plan}_desc`), defaultPlanDesc);

                  const planFeaturesRaw = getContentValue('pricing', `${plan}_features`);
                  const planFeatures: string[] | string =
                    Array.isArray(planFeaturesRaw) && planFeaturesRaw.every((f) => typeof f === 'string')
                      ? planFeaturesRaw
                      : typeof planFeaturesRaw === 'string'
                        ? planFeaturesRaw
                        : defaultPlanFeatures;

                  const popularPlan = getText(getContentValue('pricing', 'popular_plan'), 'pro');
                  
                  return (
                    <div key={plan} className="bg-white p-6 rounded-2xl border-2 border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-lg font-black text-slate-900 capitalize">{plan} Plan</h5>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={popularPlan === plan}
                            onChange={async (e) => {
                              if (e.target.checked) {
                                const result = await bulkUpdateSiteContent([{
                                  page: 'pricing',
                                  section: 'plans',
                                  key: 'popular_plan',
                                  content: plan,
                                }]);
                                if (result.success) {
                                  addToast(`תוכנית ${plan} מסומנת כפופולרית`, 'success');
                                  onRefresh();
                                }
                              }
                            }}
                            className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm font-black text-slate-700">הכי פופולרי</span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-black text-slate-600 mb-1">שם התוכנית</label>
                          <input
                            type="text"
                            defaultValue={planName}
                            onBlur={async (e) => {
                              const result = await bulkUpdateSiteContent([{
                                page: 'pricing',
                                section: 'plans',
                                key: `${plan}_name`,
                                content: e.target.value,
                              }]);
                              if (result.success) {
                                addToast('שם תוכנית עודכן', 'success');
                                onRefresh();
                              }
                            }}
                            className="w-full p-3 bg-slate-50 border border-purple-200 rounded-lg text-slate-900 outline-none focus:border-purple-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-600 mb-1">תיאור קצר</label>
                          <input
                            type="text"
                            defaultValue={planDesc}
                            onBlur={async (e) => {
                              const result = await bulkUpdateSiteContent([{
                                page: 'pricing',
                                section: 'plans',
                                key: `${plan}_desc`,
                                content: e.target.value,
                              }]);
                              if (result.success) {
                                addToast('תיאור עודכן', 'success');
                                onRefresh();
                              }
                            }}
                            className="w-full p-3 bg-slate-50 border border-purple-200 rounded-lg text-slate-900 outline-none focus:border-purple-400"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-xs font-black text-slate-600 mb-1">מחיר (₪)</label>
                        <input
                          type="number"
                          defaultValue={(() => {
                            const fallbackPrice = plan === 'starter' ? 1490 : plan === 'pro' ? 2990 : 5490;
                            const v = getContentValue('pricing', `${plan}_price`);
                            return typeof v === 'number' || typeof v === 'string' ? v || fallbackPrice : fallbackPrice;
                          })()}
                          onBlur={async (e) => {
                            const result = await bulkUpdateSiteContent([{
                              page: 'pricing',
                              section: 'plans',
                              key: `${plan}_price`,
                              content: Number(e.target.value),
                            }]);
                            if (result.success) {
                              addToast('מחיר עודכן', 'success');
                              onRefresh();
                            }
                          }}
                          className="w-full p-3 bg-slate-50 border border-purple-200 rounded-lg text-slate-900 outline-none focus:border-purple-400"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-black text-slate-600 mb-1">תכונות (רשימה מופרדת בפסיק או JSON array)</label>
                        <textarea
                          defaultValue={Array.isArray(planFeatures) ? JSON.stringify(planFeatures, null, 2) : planFeatures}
                          onBlur={async (e) => {
                            try {
                              const inputValue = e.target.value.trim();
                              let parsed: string[];
                              // Try to parse as JSON, if fails, treat as comma-separated string
                              if (inputValue.startsWith('[')) {
                                parsed = JSON.parse(inputValue);
                              } else {
                                parsed = inputValue.split(',').map((f: string) => f.trim()).filter(Boolean);
                              }
                              const result = await bulkUpdateSiteContent([{
                                page: 'pricing',
                                section: 'plans',
                                key: `${plan}_features`,
                                content: parsed,
                              }]);
                              if (result.success) {
                                addToast('תכונות עודכנו', 'success');
                                onRefresh();
                              }
                            } catch {
                              addToast('פורמט לא תקין - השתמש ב-JSON array או רשימה מופרדת בפסיק', 'error');
                            }
                          }}
                          rows={4}
                          className="w-full p-3 bg-slate-50 border border-purple-200 rounded-lg text-slate-900 font-mono text-xs outline-none focus:border-purple-400 resize-none"
                          placeholder='["תכונה 1", "תכונה 2"] או תכונה 1, תכונה 2'
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FAQ Section */}
              <div className="mt-8">
                <label className="block text-sm font-black text-slate-700 mb-2">שאלות נפוצות (FAQ) - JSON</label>
                <textarea
                  defaultValue={JSON.stringify(getContentValue('pricing', 'faq') || [
                    { q: 'האם יש התחייבות?', a: 'לא. תוכלו לבטל בכל עת ללא עמלות.' },
                    { q: 'מה כולל הניסיון החינם?', a: 'גישה מלאה לכל התכונות למשך 7 ימים.' },
                    { q: 'איך מתבצע התשלום?', a: 'תשלום אוטומטי בכרטיס אשראי בתחילת כל חודש.' },
                  ], null, 2)}
                  onBlur={async (e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      const result = await bulkUpdateSiteContent([{
                        page: 'pricing',
                        section: 'faq',
                        key: 'faq',
                        content: parsed,
                      }]);
                      if (result.success) {
                        addToast('FAQ עודכן', 'success');
                        onRefresh();
                      }
                    } catch {
                      addToast('JSON לא תקין', 'error');
                    }
                  }}
                  rows={8}
                  className="w-full p-4 bg-white border border-purple-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-purple-400 resize-none"
                />
              </div>
            </div>

            {/* Testimonials */}
            <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100">
              <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <MessageSquare className="text-emerald-600" size={24} />
                המלצות (Testimonials)
              </h4>
              <textarea
                defaultValue={JSON.stringify(getContentValue('landing', 'testimonials') || [
                  { name: 'לירון אביב', role: 'בעלים, AVIV Digital', quote: 'המעבר ל-Social חסך לנו 15 שעות עבודה בשבוע.', avatar: '' },
                ], null, 2)}
                onBlur={async (e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    const result = await bulkUpdateSiteContent([{
                      page: 'landing',
                      section: 'testimonials',
                      key: 'testimonials',
                      content: parsed,
                    }]);
                    if (result.success) {
                      addToast('המלצות עודכנו', 'success');
                      onRefresh();
                    }
                  } catch {
                    addToast('JSON לא תקין', 'error');
                  }
                }}
                rows={10}
                className="w-full p-4 bg-white border border-emerald-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-emerald-400 resize-none"
              />
            </div>

            <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h4 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <FileText className="text-slate-700" size={24} />
                  מסמכי מדיניות (Legal) - Markdown
                </h4>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await seedDefaultLegalDocuments();
                    if (!result.success) {
                      addToast('שגיאה בהזרעת מסמכים משפטיים', 'error');
                      return;
                    }

                    const seededKeys = result.data?.seededKeys ?? [];
                    if (seededKeys.length === 0) {
                      addToast('המסמכים כבר קיימים', 'info');
                    } else {
                      addToast(`הוזרעו ${seededKeys.length} מסמכים`, 'success');
                    }
                    onRefresh();
                  }}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black shadow-lg shadow-slate-900/10"
                >
                  הזרעת מסמכים משפטיים
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">מדיניות פרטיות - Markdown</label>
                  <textarea
                    defaultValue={String(getContentValue('legal', 'privacy_markdown') || '')}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'legal',
                        section: 'documents',
                        key: 'privacy_markdown',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('מדיניות פרטיות עודכנה', 'success');
                        onRefresh();
                      }
                    }}
                    rows={10}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-slate-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">תנאי שימוש - Markdown</label>
                  <textarea
                    defaultValue={String(getContentValue('legal', 'terms_markdown') || '')}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'legal',
                        section: 'documents',
                        key: 'terms_markdown',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('תנאי שימוש עודכנו', 'success');
                        onRefresh();
                      }
                    }}
                    rows={10}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-slate-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">מדיניות החזרים וזיכויים - Markdown</label>
                  <textarea
                    defaultValue={String(getContentValue('legal', 'refund_policy_markdown') || '')}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'legal',
                        section: 'documents',
                        key: 'refund_policy_markdown',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('מדיניות החזרים עודכנה', 'success');
                        onRefresh();
                      }
                    }}
                    rows={10}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-slate-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">הצהרת נגישות - Markdown</label>
                  <textarea
                    defaultValue={String(getContentValue('legal', 'accessibility_markdown') || '')}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'legal',
                        section: 'documents',
                        key: 'accessibility_markdown',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('הצהרת נגישות עודכנה', 'success');
                        onRefresh();
                      }
                    }}
                    rows={10}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-slate-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">מדיניות אבטחת מידע - Markdown</label>
                  <textarea
                    defaultValue={String(getContentValue('legal', 'security_markdown') || '')}
                    onBlur={async (e) => {
                      const result = await bulkUpdateSiteContent([{
                        page: 'legal',
                        section: 'documents',
                        key: 'security_markdown',
                        content: e.target.value,
                      }]);
                      if (result.success) {
                        addToast('מדיניות אבטחת מידע עודכנה', 'success');
                        onRefresh();
                      }
                    }}
                    rows={10}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-sm outline-none focus:border-slate-300 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


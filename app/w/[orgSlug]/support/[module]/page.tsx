import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Mail,
  Plus,
  CheckCircle2,
  HelpCircle,
  ClipboardList,
  MapPinned,
  Boxes,
  UserCog,
  Camera,
  Inbox,
  PhoneCall,
  Kanban,
  CalendarDays,
  Trophy,
  Users,
  Shield,
  Clock,
  CheckSquare,
  UserPlus,
  MessageCircle,
  Mic,
} from 'lucide-react';

import type { OSModuleKey } from '@/lib/os/modules/types';
import { getModuleDefinition, isOSModuleKey } from '@/lib/os/modules/registry';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getHelpVideosByModule } from '@/app/actions/help-videos';
import { getContentByKey } from '@/app/actions/site-content';
import { getDocsArticlesForModule, getDocsCategoriesForModule } from '@/config/docs';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

function isDirectVideo(url: string): boolean {
  const u = String(url || '').toLowerCase();
  return u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.ogg');
}

function normalizeVideoUrl(url: string): string {
  const raw = String(url || '').trim();
  const u = raw.toLowerCase();

  try {
    if (u.includes('youtube.com/watch')) {
      const parsed = new URL(raw);
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (u.includes('youtu.be/')) {
      const parsed = new URL(raw);
      const id = parsed.pathname.replace('/', '').trim();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (u.includes('vimeo.com/') && !u.includes('player.vimeo.com')) {
      const parsed = new URL(raw);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id = parts[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return raw;
  }

  return raw;
}

type SupportStep = {
  title: string;
  body: string;
  icon: React.ComponentType<{ size?: number }>;
};

type SupportFaq = {
  q: string;
  a: string;
};

type SupportLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
};

type SupportFlow = {
  title: string;
  items: string[];
};

type ModuleSupportContent = {
  heroTitle: string;
  heroSubtitle: string;
  videoHeadline: string;
  stepsHeadline: string;
  faqHeadline: string;
  quickLinksHeadline: string;
  quickLinks: SupportLink[];
  steps: SupportStep[];
  faqs: SupportFaq[];
  flow: SupportFlow | null;
};

function getModuleSupportContent(moduleKey: OSModuleKey, orgSlug: string): ModuleSupportContent {
  if (moduleKey === 'finance') {
    const base = `/w/${encodeURIComponent(orgSlug)}/finance`;
    return {
      heroTitle: 'איך להפיק חשבונית מס/קבלה ראשונה',
      heroSubtitle: '60 שניות. פעולה אחת. בלי חפירות.',
      videoHeadline: 'וידאו קצר',
      stepsHeadline: 'הצעדים (בדיוק כמו שעושים במערכת)',
      faqHeadline: 'שאלות נפוצות',
      quickLinksHeadline: 'קישורים מהירים',
      quickLinks: [
        { label: 'פתח חשבוניות', href: `${base}/invoices`, icon: FileText },
        { label: 'סקירה פיננסית', href: `${base}/overview`, icon: CheckCircle2 },
        { label: 'פרופיל', href: `${base}/me`, icon: HelpCircle },
      ] as SupportLink[],
      steps: [
        {
          title: "לכו ל'חשבוניות' ולחצו על הפלוס (+)",
          body: "בתפריט של Finance כנסו ל'חשבוניות'. שם תראו כפתור פלוס להפקת מסמך חדש.",
          icon: Plus,
        },
        {
          title: 'בחרו את הלקוח',
          body: 'בחרו לקוח קיים מהרשימה. אם צריך—צרו חדש ואז חזרו למסמך.',
          icon: CheckCircle2,
        },
        {
          title: 'הוסיפו שורות למסמך',
          body: "הכניסו את השורות (למשל: 'ביקור טכנאי'), כמות ומחיר. שמרו על ניסוח קצר וברור.",
          icon: FileText,
        },
        {
          title: "לחצו 'הפק מסמך'", 
          body: 'רק אחרי ההפקה המסמך מקבל מספר ונשלח ללקוח (לרוב במייל).',
          icon: Mail,
        },
      ] as SupportStep[],
      faqs: [
        {
          q: 'למה אין מספר מסמך לפני שהפקתי?',
          a: 'כדי למנוע “חורים” במספור. המספר נוצר רק בהפקה בפועל.',
        },
        {
          q: 'איך אני מוודא שהלקוח קיבל את המסמך במייל?',
          a: 'וודא שיש ללקוח אימייל מעודכן, ואז בהפקה/שליחה המסמך יוצא אוטומטית.',
        },
        {
          q: 'אפשר להפיק מסמך בלי לבחור לקוח?',
          a: 'לא מומלץ. המסמך צריך להיות משויך ללקוח כדי שהמעקב והשליחה יעבדו תקין.',
        },
        {
          q: 'מה השורה הכי נפוצה למסמך ראשון?',
          a: "שורה אחת קצרה: 'ביקור טכנאי' או 'שירות'. אחר כך אפשר לדייק.",
        },
        {
          q: 'הפקתי ואז גיליתי טעות—מה עושים?',
          a: 'בדרך כלל מתקנים באמצעות זיכוי/מסמך מתקן. אם צריך—פתח קריאת תמיכה ותכתוב מה קרה.',
        },
      ] as SupportFaq[],
      flow: {
        title: 'המחשה מהירה',
        items: ['חשבוניות', 'מסמך חדש', 'שורות', 'הפקה', 'נשלח ללקוח'],
      },
    };
  }

  if (moduleKey === 'nexus') {
    const base = `/w/${encodeURIComponent(orgSlug)}/nexus`;
    return {
      heroTitle: 'ניהול עובדים, נוכחות ומשימות מטה',
      heroSubtitle: 'הקמת צוות, הרשאות, נוכחות ומשימות — הכל במקום אחד.',
      videoHeadline: 'וידאו קצר',
      stepsHeadline: 'הצעדים (Timeline)',
      faqHeadline: 'שאלות נפוצות',
      quickLinksHeadline: 'קישורים מהירים',
      quickLinks: [
        { label: 'ניהול משתמשים', href: `${base}/team`, icon: Users },
        { label: 'שעון נוכחות', href: `${base}/reports?tab=attendance`, icon: Clock },
        { label: 'המשימות שלי', href: `${base}/tasks`, icon: CheckSquare },
      ] as SupportLink[],
      steps: [
        {
          title: 'הקמת הצוות',
          body: 'היכנסו להגדרות -> משתמשים והזמינו עובדים חדשים במייל.',
          icon: UserPlus,
        },
        {
          title: 'הגדרת הרשאות (Roles)',
          body: 'קבעו מי מנהל (Admin), מי איש שטח (Field) ומי מכירות.',
          icon: Shield,
        },
        {
          title: 'שעון נוכחות',
          body: 'העובדים מדווחים כניסה/יציאה מהאפליקציה (כולל מיקום).',
          icon: Clock,
        },
        {
          title: 'ניהול משימות',
          body: 'פתחו משימות שוטפות (שלא קשורות לפרויקטים) ועקבו אחרי הביצוע.',
          icon: CheckSquare,
        },
      ] as SupportStep[],
      faqs: [
        {
          q: 'איך מאפסים סיסמה לעובד?',
          a: "העובד לוחץ על 'שכחתי סיסמה' במסך הכניסה, או שאתם שולחים לו הזמנה מחדש דרך מסך המשתמשים.",
        },
        {
          q: 'האם אפשר לערוך דיווח שעות בדיעבד?',
          a: 'כן, מנהל מערכת יכול להיכנס לדוח הנוכחות ולערוך שעות ידנית במקרה של טעות.',
        },
      ] as SupportFaq[],
      flow: {
        title: 'המחשה ויזואלית',
        items: ['👥 צוות (הוספת משתמשים)', '🛡️ הרשאות (ניהול גישה)', '⏱️ נוכחות (דוחות שעות)', '✅ משימות (Task Manager)'],
      },
    };
  }

  if (moduleKey === 'system') {
    const base = `/w/${encodeURIComponent(orgSlug)}/system`;
    return {
      heroTitle: 'ניהול לידים, פייפליין ומכירות',
      heroSubtitle: 'קליטת ליד, תיעוד, ניהול תהליך וסגירה — בלי לפספס אף הזדמנות.',
      videoHeadline: 'וידאו קצר',
      stepsHeadline: 'הצעדים (Timeline)',
      faqHeadline: 'שאלות נפוצות',
      quickLinksHeadline: 'קישורים מהירים',
      quickLinks: [
        { label: 'לוח הלידים (Kanban)', href: `${base}/leads`, icon: Kanban },
        { label: 'הלידים שלי (My View)', href: `${base}/leads?filter=mine`, icon: CheckCircle2 },
        { label: 'יומן פגישות ומשימות', href: `${base}/calendar`, icon: CalendarDays },
      ] as SupportLink[],
      steps: [
        {
          title: 'קליטת ליד',
          body: 'לחצו על "ליד חדש" או חברו את הפייסבוק לקליטה אוטומטית.',
          icon: Inbox,
        },
        {
          title: 'יצירת קשר ותיעוד',
          body: 'התקשרו ללקוח מהאפליקציה ולחצו על "Log Call" כדי לתעד את השיחה.',
          icon: PhoneCall,
        },
        {
          title: 'ניהול הפייפליין',
          body: 'גררו את הליד בעמודות הקנבן (Kanban) לפי ההתקדמות (מ-"חדש" ל-"בטיפול").',
          icon: Kanban,
        },
        {
          title: 'סגירת עסקה (Won)',
          body: 'הלקוח סגר? העבירו אותו ל-Won והמערכת תציע לפתוח פרויקט או חשבונית.',
          icon: Trophy,
        },
      ] as SupportStep[],
      faqs: [
        {
          q: 'איך אני מגדיר תזכורת לחזור ללקוח?',
          a: "בכרטיס הליד, לחצו על 'משימה חדשה' (Task) וקבעו תאריך יעד. המערכת תתריע לכם בזמן.",
        },
        {
          q: 'מה קורה כשאני מעביר ליד ל-Won?',
          a: "הליד הופך ל'לקוח' (Client) ונפתח לו כרטיס קבוע במערכת להמשך טיפול.",
        },
      ] as SupportFaq[],
      flow: {
        title: 'המחשה ויזואלית',
        items: ['📥 ליד נכנס (מקורות הגעה)', '📞 תיעוד (שיחות ומשימות)', '📊 פייפליין (ניהול תהליך)', '💰 סגירה (המרת ליד ללקוח)'],
      },
    };
  }

  if (moduleKey === 'operations') {
    const base = `/w/${encodeURIComponent(orgSlug)}/operations`;
    return {
      heroTitle: 'ניהול קריאות שירות וטכנאים',
      heroSubtitle: 'פתיחת קריאה, שיגור טכנאי, ביצוע בשטח וסגירה לחיוב.',
      videoHeadline: 'וידאו קצר',
      stepsHeadline: 'הצעדים (Timeline)',
      faqHeadline: 'שאלות נפוצות',
      quickLinksHeadline: 'קישורים מהירים',
      quickLinks: [
        { label: 'לוח קריאות שירות', href: `${base}/work-orders`, icon: ClipboardList },
        { label: 'מפת טכנאים בזמן אמת', href: `${base}/map`, icon: MapPinned },
        { label: 'ניהול מלאי וחלקים', href: `${base}/inventory`, icon: Boxes },
      ] as SupportLink[],
      steps: [
        {
          title: 'פתיחת קריאה',
          body: 'לחצו על "קריאה חדשה" בלוח הבקרה ומלאו את פרטי התקלה והפרויקט.',
          icon: Plus,
        },
        {
          title: 'פקודות קוליות (Hands-free)',
          body: "לחצו על המיקרופון ואמרו 'פתח קריאה...' או 'חשבונית למשה'. אפשר גם להגיד 'פתח חשבוניות' לניווט מהיר. חשבוניות שנוצרות בקול נשמרות כ-DRAFT (טיוטה) עם התיאור שאמרתם.",
          icon: Mic,
        },
        {
          title: 'שיוך טכנאי (Dispatch)',
          body: 'בחרו את איש הצוות בשדה "שיוך טכנאי" ולחצו שמור. הוא יקבל התראה לנייד.',
          icon: UserCog,
        },
        {
          title: 'ביצוע בשטח',
          body: 'הטכנאי מדווח "הגעתי", מצלם את התקלה, ומחתים את הלקוח באפליקציה.',
          icon: Camera,
        },
        {
          title: 'סגירה וחיוב',
          body: 'הקריאה חוזרת למשרד כ"הושלמה" ומוכנה להפקת חשבונית.',
          icon: FileText,
        },
      ] as SupportStep[],
      faqs: [
        {
          q: 'האם הטכנאי יכול לעבוד בלי קליטה?',
          a: 'כן! האפליקציה שומרת את הנתונים (Offline) ומסנכרנת אותם אוטומטית כשיש קליטה.',
        },
        {
          q: 'איך הטכנאי מזהה חלקים חסרים?',
          a: 'לוחצים על אייקון המצלמה בחיפוש, וה-AI מזהה את החלק אוטומטית.',
        },
        {
          q: 'איפה נמצא הכפתור הקולי ואיך משתמשים בו?',
          a: "בכל המסכים תראו כפתור מיקרופון צף. לחצו עליו ודברו בחופשיות: 'פתח קריאה ליוסי על תקלה במזגן' או 'חשבונית למשה'.",
        },
        {
          q: 'מה זה DRAFT (טיוטת חשבונית) כשמכינים חשבונית בדיבור?',
          a: 'המערכת שומרת את החשבונית כטיוטה (DRAFT) עם התיאור שאמרתם, כדי שתוכלו לבדוק ולאשר לפני הפקה סופית.',
        },
        {
          q: 'אפשר גם ניווט בקול?',
          a: "כן. אפשר להגיד למשל 'פתח חשבוניות' / 'פתח קריאות שירות' / 'קח אותי למשימות', והמערכת תעבור למסך המתאים.",
        },
      ] as SupportFaq[],
      flow: {
        title: 'המחשה ויזואלית',
        items: ['🏢 משרד (יוצר קריאה)', '📲 טכנאי (מקבל לנייד + מנווט)', '📸 שטח (צילום + חתימה)', '✅ סיום (סנכרון למשרד)'],
      },
    };
  }

  const def = getModuleDefinition(moduleKey);
  return {
    heroTitle: `${def.labelHe}: דף תמיכה`,
    heroSubtitle: 'בקרוב: עמוד תמיכה מלא למודול הזה.',
    videoHeadline: 'וידאו',
    stepsHeadline: 'הצעדים',
    faqHeadline: 'שאלות נפוצות',
    quickLinksHeadline: 'קישורים',
    quickLinks: [
      { label: `פתח את ${def.label}`, href: `/w/${encodeURIComponent(orgSlug)}/${encodeURIComponent(moduleKey)}`, icon: ExternalLink },
    ] as SupportLink[],
    steps: [] as SupportStep[],
    faqs: [] as SupportFaq[],
    flow: null,
  };
}

export default async function WorkspaceSupportModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; module: string }> | { orgSlug: string; module: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const resolvedParams = await params;
  const { orgSlug, module } = resolvedParams;
  const sp = searchParams;

  await requireWorkspaceAccessByOrgSlug(orgSlug);

  if (!isOSModuleKey(module)) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6">
            <div className="text-lg font-black text-slate-900">מודול לא נמצא</div>
            <div className="mt-2 text-sm font-bold text-slate-600">בחר מודול חוקי מתוך הרשימה.</div>
            <div className="mt-5">
              <Link
                href={`/w/${encodeURIComponent(orgSlug)}/support`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black"
              >
                חזרה למרכז התמיכה
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const moduleKey = module as OSModuleKey;
  const def = getModuleDefinition(moduleKey);
  const accent = def.theme.accent || '#0F172A';

  const docsCategories = getDocsCategoriesForModule(moduleKey);
  const docsArticles = getDocsArticlesForModule(moduleKey);

  if (docsArticles.length > 0) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-xs font-black text-slate-500">
            <Link href={`/w/${encodeURIComponent(orgSlug)}/support`} className="hover:text-slate-700 transition-colors">
              תמיכה
            </Link>
            <span className="mx-2 text-slate-300">&gt;</span>
            <span className="text-slate-700">{def.labelHe}</span>
          </div>

          <div className="mt-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">{def.labelHe}</h1>
            <p className="mt-2 text-sm md:text-base font-bold text-slate-600">בחר קטגוריה או מאמר.</p>
            <div className="mt-5 h-1.5 w-48 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, rgba(15,23,42,0.12))` }} />
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="p-6 border-b border-white/60">
                  <div className="text-sm font-black text-slate-900">קטגוריות</div>
                  <div className="mt-1 text-xs font-bold text-slate-600">תיעוד לפי נושא</div>
                </div>
                <div className="p-6 grid grid-cols-1 gap-3">
                  {docsCategories.length ? (
                    docsCategories.map((c) => {
                      const count = docsArticles.filter((a) => a.categoryId === c.id).length;
                      return (
                        <a
                          key={c.id}
                          href={`#cat-${encodeURIComponent(c.id)}`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 truncate">{c.title}</div>
                              <div className="mt-1 text-xs font-bold text-slate-600 truncate">{c.description || ''}</div>
                            </div>
                            <div className="text-xs font-black text-slate-500">{count}</div>
                          </div>
                        </a>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-black text-slate-900">בקרוב</div>
                      <div className="mt-1 text-xs font-bold text-slate-600">נוסיף קטגוריות למודול הזה.</div>
                    </div>
                  )}
                </div>
              </div>

              <Link
                href={`/w/${encodeURIComponent(orgSlug)}/support`}
                className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black hover:bg-slate-50 transition-colors"
              >
                חזרה למרכז הידע
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {docsCategories.map((c) => {
                const items = docsArticles.filter((a) => a.categoryId === c.id);
                if (items.length === 0) return null;
                return (
                  <div key={c.id} id={`cat-${c.id}`} className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="p-6 border-b border-white/60">
                      <div className="text-sm font-black text-slate-900">{c.title}</div>
                      <div className="mt-1 text-xs font-bold text-slate-600">{c.description || ''}</div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((a) => {
                        const href = `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}/${encodeURIComponent(a.id)}`;
                        return (
                          <Link
                            key={a.id}
                            href={href}
                            className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-black text-slate-900 truncate">{a.title}</div>
                                <div className="mt-1 text-xs font-bold text-slate-600">{a.description}</div>
                              </div>
                              <div className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
                                <ArrowRight size={16} />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const content = getModuleSupportContent(moduleKey, orgSlug);

  const res = await getHelpVideosByModule(moduleKey);
  const videos = res.success && Array.isArray(res.data) ? res.data : [];
  const requestedVideoId = typeof sp?.video === 'string' ? sp.video : Array.isArray(sp?.video) ? sp?.video?.[0] : null;
  const selectedVideo = requestedVideoId ? videos.find((v) => String(v.id) === String(requestedVideoId)) || null : null;
  const video = selectedVideo || (videos.length ? videos[0] : null);
  const videoUrl = video?.videoUrl ? String(video.videoUrl) : '';

  const whatsappRes = await getContentByKey('landing', 'support', 'support_whatsapp_group_url');
  const whatsappGroupUrl = typeof whatsappRes.data === 'string' ? whatsappRes.data : '';
  const hasWhatsApp = Boolean(whatsappGroupUrl && whatsappGroupUrl.trim());

  const breadcrumbs = {
    supportHref: `/w/${encodeURIComponent(orgSlug)}/support`,
    moduleHref: `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}`,
  };

  const h1Title = video?.title ? String(video.title) : content.heroTitle;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-500">
              <Link href={breadcrumbs.supportHref} className="hover:text-slate-700 transition-colors">
                תמיכה
              </Link>
              <span className="mx-2 text-slate-300">&gt;</span>
              <Link href={breadcrumbs.moduleHref} className="hover:text-slate-700 transition-colors">
                {def.labelHe}
              </Link>
              <span className="mx-2 text-slate-300">&gt;</span>
              <span className="text-slate-700">{h1Title}</span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{h1Title}</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">{content.heroTitle}</p>
            <div className="mt-5 h-1.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, rgba(15,23,42,0.12))` }} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/w/${encodeURIComponent(orgSlug)}/${encodeURIComponent(moduleKey)}`}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-white/60 text-slate-700 font-bold hover:bg-white transition-all"
            >
              <ExternalLink size={16} />
              חזרה למודול
            </Link>
            <Link
              href={`/w/${encodeURIComponent(orgSlug)}/support`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-white/60 text-slate-700 font-bold hover:bg-white transition-all"
            >
              <ArrowRight size={16} />
              כל המודולים
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-6 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">{content.videoHeadline}</div>
                <div className="mt-1 text-xs font-bold text-slate-600">{video?.title ? String(video.title) : 'וידאו הליבה למודול'}</div>
              </div>

              <div className="p-6">
                {videoUrl ? (
                  isDirectVideo(videoUrl) ? (
                    <video className="w-full rounded-2xl bg-slate-950" controls preload="metadata" src={videoUrl} />
                  ) : (
                    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        src={normalizeVideoUrl(videoUrl)}
                        title={video?.title ? String(video.title) : content.heroTitle}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-black text-slate-900">אין עדיין סרטון למודול הזה</div>
                    <div className="mt-2 text-xs font-bold text-slate-600">אפשר להוסיף ב־Admin → גלובלי → ניהול סרטוני הדרכה.</div>
                  </div>
                )}
              </div>
            </div>

            {content.flow ? (
              <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="p-6 border-b border-white/60">
                  <div className="text-sm font-black text-slate-900">{content.flow.title}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600">מסלול פעולה מהיר, כדי להבין &quot;מה הולך לאן&quot;.</div>
                </div>
                <div className="p-6">
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
                  >
                    {content.flow.items.map((label: string, idx: number) => (
                      <div key={`${label}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שלב {idx + 1}</div>
                        <div className="mt-2 text-sm font-black text-slate-900">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-6 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">{content.stepsHeadline}</div>
                <div className="mt-1 text-xs font-bold text-slate-600">רק מה שצריך כדי לבצע פעולה אחת.</div>
              </div>

              <div className="p-6">
                {content.steps.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {content.steps.map((s, idx) => {
                      const Icon = s.icon;
                      return (
                        <div key={`${s.title}-${idx}`} className="rounded-3xl border border-slate-200 bg-white p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-slate-200 bg-slate-50 text-slate-700">
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">צעד {idx + 1}</div>
                              <div className="mt-1 text-sm font-black text-slate-900">{s.title}</div>
                              <div className="mt-2 text-sm font-bold text-slate-600 leading-relaxed">{s.body}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-black text-slate-900">בקרוב</div>
                    <div className="mt-2 text-xs font-bold text-slate-600">התוכן למודול הזה יתווסף בהמשך.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-6 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">{content.faqHeadline}</div>
                <div className="mt-1 text-xs font-bold text-slate-600">תשובות קצרות, בלי לבלבל.</div>
              </div>

              <div className="p-6 space-y-3">
                {content.faqs.length ? (
                  content.faqs.map((f, idx) => (
                    <details key={`${f.q}-${idx}`} className="group rounded-2xl border border-slate-200 bg-white p-4">
                      <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-slate-900">{f.q}</div>
                        <div className="text-xs font-black text-slate-500 group-open:text-slate-700">פתח</div>
                      </summary>
                      <div className="mt-3 text-sm font-bold text-slate-600 leading-relaxed">{f.a}</div>
                    </details>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-black text-slate-900">בקרוב</div>
                    <div className="mt-2 text-xs font-bold text-slate-600">נוסיף שאלות נפוצות למודול הזה.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {videos.length > 1 ? (
              <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="p-6 border-b border-white/60">
                  <div className="text-sm font-black text-slate-900">עוד סרטונים במודול</div>
                  <div className="mt-1 text-xs font-bold text-slate-600">בחר וידאו ספציפי לפעולה אחת.</div>
                </div>
                <div className="p-6 space-y-2">
                  {videos.map((v, idx) => {
                    const isActive = String(v.id) === String(video?.id);
                    const href = `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}?video=${encodeURIComponent(String(v.id))}`;
                    const durationLabel = (() => {
                      const raw = v?.duration;
                      const next = typeof raw === 'string' ? raw.trim() : '';
                      return next ? next : '-';
                    })();
                    return (
                      <Link
                        key={String(v.id)}
                        href={href}
                        className={`block rounded-2xl border px-4 py-3 transition-colors ${
                          isActive
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className={`text-xs font-black ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                              {idx + 1}
                            </div>
                            <div className="mt-1 text-sm font-black truncate">{String(v.title || 'ללא כותרת')}</div>
                          </div>
                          <div className={`text-xs font-black tabular-nums ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                            {durationLabel}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-6 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">{content.quickLinksHeadline}</div>
                <div className="mt-1 text-xs font-bold text-slate-600">לחיצה אחת—ואתה במקום הנכון.</div>
              </div>
              <div className="p-6 space-y-2">
                {content.quickLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate">{l.label}</div>
                        <div className="text-[11px] font-bold text-slate-500 truncate">{l.href}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-6 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">צריך עזרה אמיתית?</div>
                <div className="mt-1 text-xs font-bold text-slate-600">פתח קריאת תמיכה עם הסבר קצר ומה ניסית לעשות.</div>
              </div>
              <div className="p-6">
                <Link
                  href="/support"
                  className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors"
                >
                  עבור לטופס תמיכה
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-6 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">לא מצאת תשובה?</div>
                <div className="mt-1 text-xs font-bold text-slate-600">בחר פעולה מהירה כדי להתקדם.</div>
              </div>
              <div className="p-6 grid grid-cols-1 gap-2">
                <a
                  href={hasWhatsApp ? whatsappGroupUrl : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black transition-colors border ${
                    hasWhatsApp
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200 pointer-events-none'
                  }`}
                >
                  <MessageCircle size={16} />
                  פתח פנייה בוואטסאפ
                </a>

                <Link
                  href={breadcrumbs.supportHref}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-800 border border-slate-200 font-black hover:bg-slate-50 transition-colors"
                >
                  חזרה לכל המודולים
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

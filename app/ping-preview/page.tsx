/**
 * Ping Preview — עמוד שיווקי בטא (לא פומבי)
 * 
 * גישה רק ל-Super Admin (itsikdahan1@gmail.com)
 * מציג את החזון של Ping — המערכת שמנהלת את השיחות
 */

import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { MessageSquare, Zap, Users, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { hasPingBetaAccess } from '@/lib/ping/guard';

export const metadata: Metadata = {
  title: 'Ping — המערכת שמנהלת את השיחות | בטא',
  description: 'המערכת שמנהלת את הארגון ומנהלת את השיחות — גם פנימה, גם החוצה',
};

function WhatsAppDemo() {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.292-1.223-1.206-1.39-1.372-.362-.36-.874-.982-1.35-1.314-.583-.414-.702-.453-.933-.453-.254 0-.517.122-.721.367-.203.244-.89 1.047-.89 1.047s-.248.303-.15.598c.074.224.396.595.689.918.506.556.982 1.01 1.03 1.06.085.09.107.215-.026.355-.13.137-.361.423-.514.596-.182.204-.367.344-.576.447-.22.108-.452.147-.671.147-.225 0-.462-.04-.703-.118-.57-.19-1.098-.546-1.398-.778-.388-.298-.947-.837-1.413-1.415-.354-.436-.664-.923-.866-1.384-.222-.5-.323-1.02-.323-1.423 0-.485.123-.926.36-1.308.258-.414.617-.706.986-.849.355-.137.71-.179 1.044-.129.28.041.53.135.727.245l.025.013c.184.111.373.271.553.429.136.117.265.244.394.371.03.03.06.058.09.086.1.097.202.192.301.294.225.233.388.42.493.56l.052.074c.048.069.09.13.125.183l-.006-.006c.036.053.07.104.098.15.082.136.123.236.14.31l.006.026c.02.097.003.204-.053.308l-.01.017c-.063.117-.152.226-.266.328-.125.113-.26.215-.374.289-.097.064-.196.121-.283.162l-.033.016c-.122.058-.262.115-.398.162-.164.055-.326.093-.466.093-.11 0-.222-.023-.332-.069-.123-.051-.239-.13-.337-.239-.11-.123-.197-.275-.253-.437-.057-.166-.082-.345-.073-.52.018-.354.145-.705.37-1.02.234-.327.563-.596.94-.76.398-.174.84-.227 1.264-.15.427.078.81.284 1.087.586.293.319.47.723.503 1.14.034.424-.078.852-.314 1.212-.24.367-.586.652-.99.81-.414.163-.87.186-1.287.065-.422-.123-.79-.387-1.03-.737-.25-.365-.358-.816-.298-1.25.06-.433.307-.834.67-1.09.366-.26.83-.36 1.27-.278.44.083.83.34 1.07.703.248.374.336.838.245 1.26-.091.422-.352.796-.713 1.02-.366.23-.814.292-1.222.173-.413-.12-.764-.423-.96-.824-.202-.413-.233-.898-.085-1.337.15-.438.464-.813.863-1.026.404-.217.89-.256 1.33-.111.444.146.813.468 1.01.88.203.424.218.916.04 1.353-.18.442-.523.804-.95.994-.432.193-.933.182-1.355-.03-.428-.215-.77-.598-.93-1.05-.165-.463-.132-.984.09-1.423.222-.437.602-.784 1.052-.96.455-.18.967-.172 1.415.022.454.198.823.552 1.02 1.007.19.446.187.962-.007 1.406-.196.45-.552.82-1.004 1.027-.454.21-.968.193-1.406-.02-.444-.217-.803-.612-.98-1.09z M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </div>
        <div>
          <div className="font-bold text-slate-900">שיחה עם לקוח פוטנציאלי</div>
          <div className="text-xs text-emerald-600">הבוט עונה אוטומטית</div>
        </div>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">לקוח</div>
          <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm border border-slate-100 max-w-[80%]">
            <span className="text-slate-700">שמעתי עליכם, מתעניין בשירות לניהול לקוחות</span>
            <span className="block text-[10px] text-slate-400 mt-1">09:15</span>
          </div>
        </div>
        <div className="flex gap-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <div className="bg-emerald-100 rounded-lg rounded-tr-none px-3 py-2 shadow-sm max-w-[80%]">
            <span className="text-slate-700">היי! אשמח לעזור. באיזה תחום העסק שלך?</span>
            <span className="block text-[10px] text-emerald-600 mt-1">09:15 ✓✓</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">לקוח</div>
          <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm border border-slate-100 max-w-[80%]">
            <span className="text-slate-700">מכון כושר בתל אביב</span>
            <span className="block text-[10px] text-slate-400 mt-1">09:18</span>
          </div>
        </div>
        <div className="flex gap-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <div className="bg-emerald-100 rounded-lg rounded-tr-none px-3 py-2 shadow-sm max-w-[80%]">
            <span className="text-slate-700">מעולה! כמה מאמנים יש במכון?</span>
            <span className="block text-[10px] text-emerald-600 mt-1">09:18 ✓✓</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">לקוח</div>
          <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm border border-slate-100 max-w-[80%]">
            <span className="text-slate-700">6 אנשים</span>
            <span className="block text-[10px] text-slate-400 mt-1">09:20</span>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center animate-pulse">
          <span className="text-amber-700 font-bold text-sm">→ פתח ליד חם ב-Nexus עם עדיפות גבוהה</span>
        </div>
      </div>
    </div>
  );
}

function AttendanceDemo() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
          <Clock size={20} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-slate-900">דיווח נוכחות חכם</div>
          <div className="text-xs text-blue-600">עובד מאחר → Ping שואל</div>
        </div>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>08:05 — עובד נכנס (איחור 5 דקות)</span>
        </div>
        <div className="bg-blue-100 rounded-lg px-3 py-2">
          <span className="text-slate-700 font-medium">היי יוסי, שמתי לב שנכנסת 5 דקות אחרי. הכל תקין?</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>08:08 — יוסי עונה: "כן, תקלה בכביש 2"</span>
        </div>
        <div className="bg-slate-100 rounded-lg px-3 py-2">
          <span className="text-slate-700">Ping מעדכן דיווח נוכחות + שולח הודעה ללקוחות שממתינים</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
          <span className="text-emerald-700 font-bold text-sm">✓ הלקוחות קיבלו עדכון אוטומטי</span>
        </div>
      </div>
    </div>
  );
}

export default async function PingPreviewPage() {
  const hasAccess = await hasPingBetaAccess();
  
  if (!hasAccess) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-6">
              <span className="text-xs font-bold text-amber-700">גרסת בטא — לא פומבי</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 leading-tight">
              המערכת שמנהלת את הארגון
              <span className="block text-emerald-600">ומנהלת את השיחות שלך</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              גם פנימה, גם החוצה. לקוח כותב בוואטסאפ → הבוט עונה → AI מבין → המערכת פועלת.
              <br />
              <strong>זה ההוכחה החיה ש-MISRAD AI באמת &quot;מנהלת&quot; ולא רק &quot;מאורגנת&quot;.</strong>
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link 
                href="/app/admin/ping"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <MessageSquare size={20} />
                כניסה לממשק הניהול
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Vision */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-4">החזון — לא &quot;בוט&quot;, אלא חיבור</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Ping הוא לא &quot;עוד פיצ&apos;ר&quot;. זה החיבור שחסר — בין מה שקורה במערכת לבין העולם החיצון.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">תקשורת דו-כיוונית</h3>
              <p className="text-sm text-slate-600">
                לא רק הבוט שולח — הוא גם מקשיב. לקוח עונה, הבוט מבין, המערכת פועלת.
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Zap size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">AI מובנה</h3>
              <p className="text-sm text-slate-600">
                לא סקריפטים קשיחים — AI שמבין כוונה, שולף פרטים, ומחליט מה לעשות.
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <Users size={24} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">חיבור למודולים</h3>
              <p className="text-sm text-slate-600">
                Ping מדבר עם System, Nexus, Client — לא בודד, אלא חלק מהארגון.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Examples */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-4">דוגמאות חיות מהחיים</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              לא סתם עוד בוט — זו המערכת שמנהלת את העסק שלך בזמן אמת.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className="mb-4">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">דוגמה 1</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">ליד חם מוואטסאפ</h3>
                <p className="text-sm text-slate-600 mt-2">
                  לקוח שולח &quot;מתעניין בשירות&quot; → הבוט שואל שאלות פתיחה → AI מנתח → פותח ליד ב-Nexus עם עדיפות &quot;חם&quot;.
                </p>
              </div>
              <WhatsAppDemo />
            </div>
            
            <div>
              <div className="mb-4">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">דוגמה 2</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">דיווח עיכוב אוטומטי</h3>
                <p className="text-sm text-slate-600 mt-2">
                  עובד נכנס באיחור → Ping שואל מה קרה → מעדכן נוכחות + שולח עדכון ללקוחות אוטומטית.
                </p>
              </div>
              <AttendanceDemo />
            </div>
          </div>
        </div>
      </section>

      {/* What's Next */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-black text-slate-900 mb-6">מה הלאה?</h2>
          
          <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <CheckCircle size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-sm">שאלונים חכמים</div>
                <div className="text-xs text-slate-600">הגדר שאלות, AI ישאל וישלוף פרטים</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <CheckCircle size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-sm">חיבור וואטסאפ Business API</div>
                <div className="text-xs text-slate-600">לא רק webhook — חיבור מלא לערוץ</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <CheckCircle size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-sm">התראות פרואקטיביות</div>
                <div className="text-xs text-slate-600">המערכת תזהה ותפנה לעובדים/לקוחות</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <CheckCircle size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-sm">SMS ו-Voicenter</div>
                <div className="text-xs text-slate-600">יותר מוואטסאפ — כל ערוץ תקשורת</div>
              </div>
            </div>
          </div>

          <Link 
            href="/app/admin/ping"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            <ArrowRight size={20} />
            כניסה לממשק הניהול
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">
            Ping — חלק מ-MISRAD AI • בטא פנימית בלבד
          </p>
        </div>
      </footer>
    </div>
  );
}

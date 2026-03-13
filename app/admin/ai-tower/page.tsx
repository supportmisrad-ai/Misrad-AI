'use server';

import { redirect } from 'next/navigation';
import { 
  checkAITowerAccess, 
  requireAITowerAccess,
  hasPermission,
  AITowerAccessCheck,
  AITowerPermission 
} from '@/lib/ai/ai-tower-guard';
import { watchtower } from '@/lib/ai/watchtower-engine';
import { Suspense } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  BarChart3, 
  BrainCircuit, 
  Zap, 
  Users, 
  Bell 
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// מגדל שמירה AI - מרכז הבקרה
// ═══════════════════════════════════════════════════════════════════

export default async function AITowerCommandCenterPage() {
  // 🛡️ בדיקת אבטחה היררכית מלאה
  const access = await checkAITowerAccess();
  
  if (!access.granted) {
    // אין גישה - הפנה לדף הסבר
    redirect('/ai-tower-unauthorized?reason=' + encodeURIComponent(access.reason || 'אין הרשאה'));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  מגדל שמירה <span className="text-blue-600">AI</span>
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  {access.role} • {access.planModules?.length || 0} מודולים פעילים
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">רמת גישה</span>
                <span className="text-sm font-bold text-slate-700">
                  {access.level === 'SUPER_ADMIN' ? 'מנהל מערכת על' : 
                   access.level === 'ORG_ADMIN' ? 'מנכ״ל / אדמין' :
                   access.level === 'ORG_MANAGER' ? 'מנהל צוות' : 'עובד'}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden md:block mx-2" />
              {hasPermission(access, 'view_sensitive_data') && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <Lock size={12} />
                  מידע רגיש מאובטח
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview - רק למי שיש הרשאה */}
        {hasPermission(access, 'view_all_insights') && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="אירועים היום" value="0" icon={<BarChart3 size={20} />} color="blue" />
            <StatCard title="תובנות פעילות" value="0" icon={<BrainCircuit size={20} />} color="amber" />
            <StatCard title="פעולות אוטומטיות" value="0" icon={<Zap size={20} />} color="emerald" />
            <StatCard title="לקוחות במעקב" value="0" icon={<Users size={20} />} color="purple" />
          </div>
        )}

        {/* Action Cards Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Bell className="text-blue-600" size={20} />
              <h2 className="text-xl font-bold text-slate-900">תובנות שדורשות פעולה</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <ShieldCheck size={14} />
              אבטחה היררכית פעילה
            </div>
          </div>
          <Suspense fallback={<ActionCardsSkeleton />}>
            <ActionCardsList access={access} />
          </Suspense>
        </div>

        {/* Permissions & Audit Info */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="text-slate-400" size={18} />
              <h3 className="font-bold text-slate-800 text-sm">הרשאות הגישה שלך:</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {access.permissions.map((perm) => (
                <span 
                  key={perm}
                  className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600"
                >
                  {translatePermission(perm)}
                </span>
              ))}
            </div>
          </div>

          {hasPermission(access, 'view_sensitive_data') && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="text-emerald-500" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">ניטור ואבטחה (Audit Log):</h3>
              </div>
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="text-xs font-bold text-slate-500">מזהה פעולה:</div>
                <div className="text-xs font-mono font-bold text-slate-700">{access.auditLogId || 'N/A'}</div>
              </div>
              <p className="mt-3 text-[10px] text-slate-400 font-medium leading-relaxed">
                כל פעולה במגדל השמירה מתועדת ונשמרת ביומן האבטחה של הארגון. 
                הגישה שלך מנוטרת לצרכי אבטחת מידע ובקרת איכות.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

function translatePermission(perm: AITowerPermission): string {
  const translations: Record<AITowerPermission, string> = {
    'view_all_insights': 'צפייה בכל התובנות',
    'view_team_insights': 'צפייה בתובנות צוות',
    'view_personal_insights': 'צפייה בתובנות אישיות',
    'execute_actions': 'ביצוע פעולות',
    'approve_auto_actions': 'אישור פעולות אוטומטיות',
    'configure_rules': 'הגדרת חוקים',
    'view_financial_insights': 'צפייה במידע כספי',
    'view_sensitive_data': 'צפייה במידע רגיש',
  };
  return translations[perm] || perm;
}

// ═══════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════

function StatCard({ title, value, icon, color }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: 'blue' | 'amber' | 'emerald' | 'purple' 
}) {
  const colors = {
    blue: 'bg-blue-600 text-white shadow-blue-100',
    amber: 'bg-amber-500 text-white shadow-amber-100',
    emerald: 'bg-emerald-600 text-white shadow-emerald-100',
    purple: 'bg-purple-600 text-white shadow-purple-100',
  };

  const bgColors = {
    blue: 'bg-blue-50/50 border-blue-100',
    amber: 'bg-amber-50/50 border-amber-100',
    emerald: 'bg-emerald-50/50 border-emerald-100',
    purple: 'bg-purple-50/50 border-purple-100',
  };

  return (
    <div className={`rounded-2xl border p-6 transition hover:shadow-md ${bgColors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-3xl font-black text-slate-900">{value}</p>
        </div>
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

async function ActionCardsList({ access }: { access: AITowerAccessCheck }) {
  // שליפת תובנות מסוננות לפי הרשאות
  const allInsights = await watchtower.getActiveInsights(access.organizationId || '');
  
  // סינון לפי הרשאות המשתמש
  const visibleInsights = allInsights.filter(insight => {
    // Super Admin רואה הכל
    if (access.level === 'SUPER_ADMIN') return true;
    
    // ORG_ADMIN רואה הכל בארגון
    if (access.level === 'ORG_ADMIN') return true;
    
    // ORG_MANAGER רואה תובנות צוות
    if (access.level === 'ORG_MANAGER') {
      return hasPermission(access, 'view_team_insights') || 
             insight.entityId === access.userId;
    }
    
    // ORG_WORKER רואה רק אישי
    if (access.level === 'ORG_WORKER') {
      return insight.entityId === access.userId;
    }
    
    return false;
  });

  if (visibleInsights.length === 0) {
    return (
      <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
          <BrainCircuit size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900">אין תובנות פעילות כרגע</h3>
        <p className="mt-2 text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
          מגדל השמירה עוקב אחרי האירועים בארגון. ברגע שיתגלו דפוסים רלוונטיים עבורך,
          תובנות ופעולות יופיעו כאן.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleInsights.map((insight) => (
        <div
          key={insight.id}
          className={`rounded-2xl border p-6 bg-white shadow-sm transition hover:shadow-md ${
            insight.severity === 'critical' ? 'border-red-200' : 
            insight.severity === 'high' ? 'border-orange-200' : 
            insight.severity === 'medium' ? 'border-amber-200' : 'border-blue-200'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              insight.severity === 'critical' ? 'bg-red-600 text-white shadow-red-100' : 
              insight.severity === 'high' ? 'bg-orange-500 text-white shadow-orange-100' : 
              insight.severity === 'medium' ? 'bg-amber-500 text-white shadow-amber-100' : 'bg-blue-600 text-white shadow-blue-100'
            }`}>
              {insight.entityType === 'client' ? <Users size={28} /> : 
               insight.entityType === 'invoice' ? <BarChart3 size={28} /> :
               insight.entityType === 'user' ? <Users size={28} /> : <Zap size={28} />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                  insight.severity === 'critical' ? 'bg-red-50 text-red-700' : 
                  insight.severity === 'high' ? 'bg-orange-50 text-orange-700' : 
                  insight.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {insight.severity === 'critical' ? 'קריטי' : 
                   insight.severity === 'high' ? 'דחוף' : 
                   insight.severity === 'medium' ? 'בינוני' : 'מידע'}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {new Date(insight.createdAt || Date.now()).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">{insight.title}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500 leading-relaxed">{insight.description}</p>
            </div>
            
            <div className="shrink-0 w-full md:w-auto">
              {insight.suggestedAction && hasPermission(access, 'execute_actions') && (
                <button className="w-full md:w-auto px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition">
                  {insight.suggestedAction.label}
                </button>
              )}
              
              {!hasPermission(access, 'execute_actions') && insight.suggestedAction && (
                <p className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-center">
                  נדרש אישור מנהל לביצוע פעולה
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionCardsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-white border border-slate-200" />
      ))}
    </div>
  );
}

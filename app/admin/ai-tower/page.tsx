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

// ═══════════════════════════════════════════════════════════════════
// AI Tower - Command Center (מוגן ב-Guard מלא)
// ═══════════════════════════════════════════════════════════════════

export default async function AITowerCommandCenterPage() {
  // 🛡️ בדיקת אבטחה היררכית מלאה
  const access = await checkAITowerAccess();
  
  if (!access.granted) {
    // אין גישה - הפנה לדף הסבר
    redirect('/ai-tower-unauthorized?reason=' + encodeURIComponent(access.reason || 'אין הרשאה'));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                🏛️ מגדל שמירה <span className="text-amber-400">AI</span>
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                מרכז הבקרה החכם • {access.role} • {access.planModules?.length || 0} מודולים
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                {access.level === 'SUPER_ADMIN' ? 'מנהל מערכת' : 
                 access.level === 'ORG_ADMIN' ? 'מנהל ארגון' :
                 access.level === 'ORG_MANAGER' ? 'מנהל' : 'עובד'}
              </span>
              {hasPermission(access, 'view_sensitive_data') && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  🔐 מידע רגיש
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview - רק למי שיש הרשאה */}
        {hasPermission(access, 'view_all_insights') && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="אירועים היום" value="0" icon="📊" color="blue" />
            <StatCard title="תובנות פעילות" value="0" icon="💡" color="amber" />
            <StatCard title="פעולות אוטומטיות" value="0" icon="⚡" color="emerald" />
            <StatCard title="לקוחות במעקב" value="0" icon="👥" color="purple" />
          </div>
        )}

        {/* Action Cards Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">תובנות חכמות</h2>
            <span className="text-xs text-slate-500">
              מוצגות: {access.permissions.length} הרשאות
            </span>
          </div>
          <Suspense fallback={<ActionCardsSkeleton />}>
            <ActionCardsList access={access} />
          </Suspense>
        </div>

        {/* Permissions Info */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">🔒 הרשאות שלך:</h3>
          <div className="flex flex-wrap gap-2">
            {access.permissions.map((perm) => (
              <span 
                key={perm}
                className="inline-flex items-center rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400"
              >
                {translatePermission(perm)}
              </span>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        {hasPermission(access, 'view_sensitive_data') && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-white">לוג אבטחה אחרון</h2>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="p-6 text-center text-slate-400">
                <p>Audit ID: {access.auditLogId || 'N/A'}</p>
                <p className="mt-2 text-sm text-slate-500">
                  כל גישה נרשמת ונבדקת
                </p>
              </div>
            </div>
          </div>
        )}
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
  icon: string; 
  color: 'blue' | 'amber' | 'emerald' | 'purple' 
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  };

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 p-6 ring-1 ring-inset ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
          <span className="text-2xl">🎯</span>
        </div>
        <h3 className="text-lg font-medium text-white">אין תובנות פעילות</h3>
        <p className="mt-1 text-sm text-slate-400">
          המערכת עוקבת אחרי האירועים. ברגע שיתגלו דפוסים רלוונטיים,
          תובנות יופיעו כאן בהתאם להרשאות שלך.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleInsights.map((insight) => (
        <div
          key={insight.id}
          className={`rounded-xl border p-4 ${
            insight.severity === 'critical'
              ? 'border-red-500/30 bg-red-500/5'
              : insight.severity === 'high'
              ? 'border-orange-500/30 bg-orange-500/5'
              : insight.severity === 'medium'
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-blue-500/30 bg-blue-500/5'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-white">{insight.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{insight.description}</p>
              
              {insight.suggestedAction && hasPermission(access, 'execute_actions') && (
                <button className="mt-3 inline-flex items-center rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
                  {insight.suggestedAction.label}
                </button>
              )}
              
              {!hasPermission(access, 'execute_actions') && insight.suggestedAction && (
                <p className="mt-2 text-xs text-slate-500">
                  נדרש אישור מנהל לביצוע פעולה זו
                </p>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                insight.severity === 'critical'
                  ? 'bg-red-500/20 text-red-400'
                  : insight.severity === 'high'
                  ? 'bg-orange-500/20 text-orange-400'
                  : insight.severity === 'medium'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {insight.severity === 'critical' ? 'קריטי' : 
               insight.severity === 'high' ? 'דחוף' : 
               insight.severity === 'medium' ? 'בינוני' : 'מידע'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionCardsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800" />
      ))}
    </div>
  );
}

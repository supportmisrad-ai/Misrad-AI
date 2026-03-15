'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  MousePointerClick, Users, DollarSign, TrendingUp, 
  Copy, Share2, Link2, Calendar, ArrowRight, 
  CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface DashboardData {
  partner: {
    id: string;
    name: string;
    referralCode: string;
  };
  stats: {
    totalClicks: number;
    uniqueVisitors: number;
    conversions: number;
    conversionRate: string;
    totalCommission: number;
    pendingCommission: number;
  };
  recentActivity: Array<{
    id: string;
    createdAt: string;
    converted: boolean;
    commission: number;
  }>;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get('id');
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!partnerId) {
      setError('לא נמצא מזהה שותף');
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [partnerId]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/partners/dashboard?id=${partnerId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!data) return;
    const link = `https://misrad-ai.com/?ref=${data.partner.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!data) return;
    const text = encodeURIComponent(
      `היי! 👋\n\n` +
      `רציתי להמליץ לך על MISRAD AI - מערכת ניהול עסקי מדהימה שחוסכת המון זמן! 🚀\n\n` +
      `🎁 אם תירשם דרך הלינק שלי תקבל 50% הנחה ל-6 חודשים!\n\n` +
      `https://misrad-ai.com/?ref=${data.partner.referralCode}\n\n` +
      `שווה לבדוק! 💪`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-lg">{error || 'שגיאה לא ידועה'}</p>
        </div>
      </div>
    );
  }

  const shareLink = `https://misrad-ai.com/?ref=${data.partner.referralCode}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">לוח הבקרה שלך</h1>
          <p className="text-slate-400">שלום {data.partner.name}! כאן תוכל לעקוב אחרי הביצועים שלך</p>
        </motion.div>

        {/* Share Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">הלינק שלך לשיתוף</h2>
              <p className="text-indigo-100 text-sm">כל מי שנכנס דרך הלינק הזה נרשם תחתיך</p>
            </div>
            
            <div className="flex-1 w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-200" />
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  onClick={copyLink}
                  className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
                >
                  {copied ? 'הועתק!' : 'העתק'}
                </button>
              </div>
            </div>

            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 rounded-xl font-medium hover:bg-green-400 transition whitespace-nowrap"
            >
              <Share2 className="w-5 h-5" />
              שתף בוואטסאפ
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">לחיצות</span>
              <MousePointerClick className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold">{data.stats.totalClicks}</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">מבקרים ייחודיים</span>
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold">{data.stats.uniqueVisitors}</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">המרות</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold">{data.stats.conversions}</p>
            <p className="text-sm text-slate-400 mt-1">{data.stats.conversionRate}% המרה</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">עמלה שנצברה</span>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold">₪{data.stats.totalCommission.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">₪{data.stats.pendingCommission} ממתינה</p>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            פעילות אחרונה
          </h3>

          {data.recentActivity.length === 0 ? (
            <p className="text-slate-400 text-center py-8">עדיין אין פעילות. התחל לשתף את הלינק שלך!</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {item.converted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <MousePointerClick className="w-5 h-5 text-blue-400" />
                    )}
                    <div>
                      <p className="font-medium">
                        {item.converted ? 'המרה חדשה!' : 'לחיצה חדשה'}
                      </p>
                      <p className="text-sm text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  {item.converted && item.commission > 0 && (
                    <span className="text-green-400 font-bold">
                      +₪{item.commission}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid md:grid-cols-3 gap-4"
        >
          <div className="bg-indigo-900/30 rounded-xl p-4 border border-indigo-800">
            <h4 className="font-bold mb-2 text-indigo-300">💡 טיפ #1</h4>
            <p className="text-sm text-slate-300">שתף בקבוצות וואטסאפ של עצמאים ויזמים</p>
          </div>
          <div className="bg-indigo-900/30 rounded-xl p-4 border border-indigo-800">
            <h4 className="font-bold mb-2 text-indigo-300">💡 טיפ #2</h4>
            <p className="text-sm text-slate-300">הוסף הסבר אישי למה MISRAD AI עזר לך</p>
          </div>
          <div className="bg-indigo-900/30 rounded-xl p-4 border border-indigo-800">
            <h4 className="font-bold mb-2 text-indigo-300">💡 טיפ #3</h4>
            <p className="text-sm text-slate-300">שתף בפייסבוק ולינקדאין בקהילות מקצועיות</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PartnerDashboardClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

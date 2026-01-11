'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap, Wrench, Bug, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getUpdatesWithStatus, markUpdateAsViewed, AppUpdate } from '@/app/actions/updates';
import { useApp } from '@/contexts/AppContext';

interface UpdatesTabProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CATEGORY_CONFIG = {
  security: { icon: Shield, color: 'bg-red-100 text-red-700 border-red-200', label: 'אבטחה' },
  feature: { icon: Sparkles, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'פיצ\'ר חדש' },
  improvement: { icon: Zap, color: 'bg-green-100 text-green-700 border-green-200', label: 'שיפור' },
  bugfix: { icon: Bug, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'תיקון באג' },
  breaking: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'שינוי משמעותי' },
};

const PRIORITY_CONFIG = {
  low: { label: 'נמוך', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'בינוני', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'גבוה', color: 'bg-orange-100 text-orange-600' },
  critical: { label: 'קריטי', color: 'bg-red-100 text-red-600' },
};

export default function UpdatesTab({ onNotify }: UpdatesTabProps) {
  const { addToast } = useApp();
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const result = await getUpdatesWithStatus();
      if (result.success && result.data) {
        setUpdates(result.data);
      } else {
        onNotify(result.error || 'שגיאה בטעינת עדכונים', 'error');
      }
    } catch (error) {
      console.error('Error loading updates:', error);
      onNotify('שגיאה בטעינת עדכונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (updateId: string) => {
    setMarkingAsRead(updateId);
    try {
      const result = await markUpdateAsViewed(updateId);
      if (result.success) {
        setUpdates(prev => prev.map(u => u.id === updateId ? { ...u, isViewed: true } : u));
        addToast('עדכון סומן כנקרא');
      } else {
        onNotify(result.error || 'שגיאה בסימון עדכון', 'error');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      onNotify('שגיאה בסימון עדכון', 'error');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadUpdates = updates.filter(u => !u.isViewed);
    for (const update of unreadUpdates) {
      await handleMarkAsRead(update.id);
    }
    addToast('כל העדכונים סומנו כנקראים');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const unreadCount = updates.filter(u => !u.isViewed).length;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10 pb-20" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800">עדכוני אפליקציה</h2>
          <p className="text-sm font-bold text-slate-400 mt-2">
            הישארו מעודכנים עם כל השינויים והשיפורים החדשים
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all"
          >
            סמן הכל כנקרא ({unreadCount})
          </button>
        )}
      </div>

      {updates.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-400 font-bold">אין עדכונים להצגה</p>
        </div>
      ) : (
        <div className="space-y-6">
          {updates.map((update) => {
            const categoryConfig = CATEGORY_CONFIG[update.category];
            const priorityConfig = PRIORITY_CONFIG[update.priority];
            const CategoryIcon = categoryConfig.icon;

            return (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white p-8 rounded-3xl border-2 shadow-xl transition-all ${
                  update.isViewed 
                    ? 'border-slate-200 opacity-75' 
                    : 'border-blue-200 shadow-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-6 mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 ${categoryConfig.color} rounded-2xl flex items-center justify-center shrink-0 border-2`}>
                      <CategoryIcon size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-black text-slate-900">{update.title}</h3>
                        <span className="text-xs font-black px-3 py-1 rounded-lg bg-slate-100 text-slate-600">
                          v{update.version}
                        </span>
                        <span className={`text-xs font-black px-3 py-1 rounded-lg ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                        {!update.isViewed && (
                          <span className="text-xs font-black px-3 py-1 rounded-lg bg-blue-600 text-white">
                            חדש
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed">
                        {update.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span>{new Date(update.publishedAt).toLocaleDateString('he-IL', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                    {update.isViewed && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 size={14} />
                        נקרא
                      </span>
                    )}
                  </div>
                  {!update.isViewed && (
                    <button
                      onClick={() => handleMarkAsRead(update.id)}
                      disabled={markingAsRead === update.id}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {markingAsRead === update.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          מסמן...
                        </>
                      ) : (
                        'סמן כנקרא'
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}


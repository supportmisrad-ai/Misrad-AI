'use client';

import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

type NotificationChannel = 'push' | 'email' | 'both' | 'none';

export default function NotificationSettings() {
  const [channel, setChannel] = useState<NotificationChannel>('both');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      localStorage.setItem('support_notification_channel', channel);
      
      setStatus({ type: 'success', message: 'הגדרות התראות נשמרו בהצלחה' });
    } catch (error) {
      setStatus({ type: 'error', message: 'שגיאה בשמירת הגדרות' });
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('support_notification_channel') as NotificationChannel;
    if (saved) setChannel(saved);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bell size={20} className="text-indigo-600" />
          <h3 className="text-lg font-black text-slate-900">הגדרות התראות</h3>
        </div>
        <p className="text-sm text-slate-600">
          בחר כיצד ברצונך לקבל התראות על תקלות חדשות ועדכונים
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setChannel('both')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
            channel === 'both'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Smartphone size={18} className={channel === 'both' ? 'text-indigo-600' : 'text-slate-500'} />
            <Mail size={18} className={channel === 'both' ? 'text-indigo-600' : 'text-slate-500'} />
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm font-black text-slate-900">Push + Email</div>
            <div className="text-xs text-slate-600">קבל התראות בשני הערוצים</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setChannel('push')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
            channel === 'push'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <Smartphone size={18} className={channel === 'push' ? 'text-indigo-600' : 'text-slate-500'} />
          <div className="flex-1 text-right">
            <div className="text-sm font-black text-slate-900">Push בלבד</div>
            <div className="text-xs text-slate-600">התראות דחיפה בלבד</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setChannel('email')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
            channel === 'email'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <Mail size={18} className={channel === 'email' ? 'text-indigo-600' : 'text-slate-500'} />
          <div className="flex-1 text-right">
            <div className="text-sm font-black text-slate-900">Email בלבד</div>
            <div className="text-xs text-slate-600">התראות במייל בלבד</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setChannel('none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
            channel === 'none'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-5 h-5" />
          <div className="flex-1 text-right">
            <div className="text-sm font-black text-slate-900">ללא התראות</div>
            <div className="text-xs text-slate-600">אל תשלח התראות</div>
          </div>
        </button>
      </div>

      {status ? (
        <div
          className={`text-sm font-bold px-4 py-2 rounded-xl ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
      >
        <Save size={16} />
        {isSaving ? 'שומר...' : 'שמור הגדרות'}
      </Button>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="text-xs font-bold text-amber-800 mb-1">שים לב</div>
        <div className="text-xs text-amber-700">
          התראות יישלחו רק עבור תקלות חדשות ועדכוני סטטוס משמעותיים.
          ניתן לשנות הגדרות אלו בכל עת.
        </div>
      </div>
    </div>
  );
}

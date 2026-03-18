'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Copy, Save, Server, Loader2, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface TelephonySettingsViewProps {
  orgSlug: string;
}

export default function TelephonySettingsView({ orgSlug }: TelephonySettingsViewProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  const [credentials, setCredentials] = useState({
    UserCode: '',
    OrganizationCode: ''
  });

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/voicenter?orgId=${orgSlug}` 
    : '';

  useEffect(() => {
    async function loadSettings() {
      if (!orgSlug) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/settings/telephony?tenantId=${orgSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.integration && data.integration.provider === 'voicenter') {
            setIsActive(data.integration.isActive);
            setCredentials({
              UserCode: data.integration.credentials?.UserCode || '',
              OrganizationCode: data.integration.credentials?.OrganizationCode || ''
            });
          }
        }
      } catch (e) {
        console.error('Failed to load telephony settings', e);
      } finally {
        setLoading(false);
      }
    }
    void loadSettings();
  }, [orgSlug]);

  const handleSave = async () => {
    if (!credentials.UserCode || !credentials.OrganizationCode) {
      addToast('חובה להזין UserCode ו-OrganizationCode', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/settings/telephony?tenantId=${orgSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'voicenter',
          isActive,
          credentials
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      addToast('הגדרות נשמרו בהצלחה', 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'שגיאה בשמירת הגדרות', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/telephony/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: 24 })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      addToast(data.message || `סונכרנו ${data.syncedCount || 0} שיחות בהצלחה`, 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'שגיאה בסנכרון נתונים', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyWebhook = () => {
    void navigator.clipboard.writeText(webhookUrl);
    addToast('כתובת הוובהוק הועתקה', 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-3xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-2xl shrink-0">
            <Phone size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">חיבור מרכזיית Voicenter</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              חיבור המרכזייה מאפשר להוציא שיחות מתוך המערכת (Click 2 Call), לקבל הקפצת מסך בשיחה נכנסת,
              ולשמור את היסטוריית השיחות כולל הקלטות.
            </p>
          </div>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Server size={20} className="text-primary" />
              פרטי חיבור API
            </h3>
            <p className="text-xs text-slate-500 mt-1">יש להזין את הפרטים ממערכת Voicenter</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">פעיל</span>
            <div 
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">User Code</label>
              <input 
                type="text" 
                value={credentials.UserCode}
                onChange={e => setCredentials({...credentials, UserCode: e.target.value})}
                dir="ltr"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-primary outline-none"
                placeholder="Ex: 5f4e3d2c1b..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Organization Code</label>
              <input 
                type="text" 
                value={credentials.OrganizationCode}
                onChange={e => setCredentials({...credentials, OrganizationCode: e.target.value})}
                dir="ltr"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-primary outline-none"
                placeholder="Ex: 1a2b3c4d5e..."
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">כתובת Webhook ל-CDR והקפצת מסך</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly
                value={webhookUrl}
                dir="ltr"
                className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-600"
              />
              <button 
                onClick={handleCopyWebhook}
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 font-bold text-sm"
              >
                <Copy size={16} /> העתק
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              יש להזין כתובת זו ב-Voicenter בהגדרות "Send Call Events" ו-"Screen Pop".
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            שמור הגדרות
          </button>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database size={20} className="text-primary" />
            כלים נוספים
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                סנכרון שיחות אקטיבי <AlertCircle size={14} className="text-amber-500" />
              </div>
              <div className="text-sm text-slate-500 mt-1">
                משיכת היסטוריית שיחות מה-24 שעות האחרונות מ-Voicenter (במידה וה-Webhook לא פעל)
              </div>
            </div>
            <button 
              onClick={handleSync}
              disabled={syncing || !isActive}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              סנכרן עכשיו
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

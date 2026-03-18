'use client';

import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Save } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/context/DataContext';
import { adminGetGlobalDownloadLinks, adminUpdateGlobalDownloadLinks } from '@/app/actions/global-download-links';
import { getErrorMessage } from '@/lib/shared/unknown';

export default function AdminGlobalDownloadsPageClient() {
  const { addToast } = useData();

  const [windowsDownloadUrl, setWindowsDownloadUrl] = useState('');
  const [androidDownloadUrl, setAndroidDownloadUrl] = useState('');
  const [adminAndroidDownloadUrl, setAdminAndroidDownloadUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminGetGlobalDownloadLinks();
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת לינקים', 'error');
        return;
      }
      setWindowsDownloadUrl(String(res.data?.windowsDownloadUrl || ''));
      setAndroidDownloadUrl(String(res.data?.androidDownloadUrl || ''));
      setAdminAndroidDownloadUrl(String(res.data?.adminAndroidDownloadUrl || ''));
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בטעינת לינקים', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminUpdateGlobalDownloadLinks({
        windowsDownloadUrl: windowsDownloadUrl.trim() ? windowsDownloadUrl.trim() : null,
        androidDownloadUrl: androidDownloadUrl.trim() ? androidDownloadUrl.trim() : null,
        adminAndroidDownloadUrl: adminAndroidDownloadUrl.trim() ? adminAndroidDownloadUrl.trim() : null,
      });
      if (!res.success) {
        addToast(res.error || 'שגיאה בשמירה', 'error');
        return;
      }
      setWindowsDownloadUrl(String(res.data?.windowsDownloadUrl || ''));
      setAndroidDownloadUrl(String(res.data?.androidDownloadUrl || ''));
      setAdminAndroidDownloadUrl(String(res.data?.adminAndroidDownloadUrl || ''));
      addToast('נשמר בהצלחה', 'success');
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בשמירה', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="לינקים להורדה" subtitle="ניהול לינקי הורדה לאפליקציות" icon={Download} />
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="text-base font-black text-slate-900">לינקים להורדה</div>
          <div className="text-sm font-medium text-slate-500 mt-1">
            הלינקים האלו משמשים את מסך הכניסה, ה-Welcome Email, ו-API ההורדות.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading || saving}>
            <RefreshCw size={16} className="ml-2" />
            רענן
          </Button>
          <Button onClick={save} disabled={loading || saving} className="font-bold">
            <Save size={16} className="ml-2" />
            {saving ? 'שומר…' : 'שמירה'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Windows Download URL</div>
          <Input
            value={windowsDownloadUrl}
            onChange={(e) => setWindowsDownloadUrl(e.target.value)}
            placeholder="https://.../MISRAD-AI-Setup.exe"
            disabled={loading || saving}
            className="bg-slate-50 border-slate-200 focus:bg-white"
          />
          <div className="text-[11px] font-medium text-slate-400">השאר ריק כדי להסיר לינק (fallback ל-ENV).</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Android Download URL</div>
          <Input
            value={androidDownloadUrl}
            onChange={(e) => setAndroidDownloadUrl(e.target.value)}
            placeholder="https://.../misrad.apk"
            disabled={loading || saving}
            className="bg-slate-50 border-slate-200 focus:bg-white"
          />
          <div className="text-[11px] font-medium text-slate-400">השאר ריק כדי להסיר לינק (fallback ל-ENV).</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Admin APK Download URL</div>
          <Input
            value={adminAndroidDownloadUrl}
            onChange={(e) => setAdminAndroidDownloadUrl(e.target.value)}
            placeholder="https://.../misrad-admin.apk"
            disabled={loading || saving}
            className="bg-slate-50 border-slate-200 focus:bg-white"
          />
          <div className="text-[11px] font-medium text-slate-400">APK אדמין נפרד עם טביעת אצבע.</div>
        </div>
      </div>
    </div>
    </div>
  );
}

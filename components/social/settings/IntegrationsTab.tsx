'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, MessageSquare, FileSpreadsheet, ExternalLink, Link2, CheckCircle2, Calendar, Workflow, RefreshCw, X } from 'lucide-react';
import {
  getAllIntegrationsStatusForWorkspace,
  getGoogleCalendarAuthUrl,
  getGoogleSheetsAuthUrl,
  syncGoogleCalendar,
  disconnectIntegration,
  saveWebhookConfig,
  saveMorningCredentialsForWorkspace,
  triggerWebhookEvent,
} from '@/app/actions/integrations';
import { useApp } from '@/contexts/AppContext';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { Skeleton } from '@/components/ui/skeletons';

interface IntegrationsTabProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface IntegrationConfig {
  id: string;
  name: string;
  icon: any;
  color: string;
  desc: string;
  type: 'oauth' | 'webhook' | 'api_key';
}

export default function IntegrationsTab({ onNotify }: IntegrationsTabProps) {
  const { addToast } = useApp();
  const pathname = usePathname();
  const routeInfo = parseWorkspaceRoute(pathname);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>({});

  const integrationConfigs: IntegrationConfig[] = [
    { id: 'make', name: 'Make.com', icon: Workflow, color: 'bg-[#6D28D9]', desc: 'חיבור וובוקים (Webhooks) ואוטומציות מורכבות לניהול זרימת עבודה חכמה.', type: 'webhook' },
    { id: 'morning', name: 'Morning', icon: Zap, color: 'bg-[#00d07d]', desc: 'הפקת חשבוניות אוטומטית ברגע שהלקוח משלם בפורטל.', type: 'api_key' },
    { id: 'calendar', name: 'Google Calendar', icon: Calendar, color: 'bg-white border border-slate-100 text-red-500', desc: 'סנכרון לוח השידורים של המשרד עם לוח השנה האישי ולוח השנה של הלקוח.', type: 'oauth' },
    { id: 'zapier', name: 'Zapier', icon: Link2, color: 'bg-[#ff4f00]', desc: 'חבר את Social לאלפי אפליקציות וייעל תהליכי עבודה.', type: 'webhook' },
    { id: 'slack', name: 'Slack Notifications', icon: MessageSquare, color: 'bg-[#4a154b]', desc: 'קבל עדכונים על אישורי פוסטים ובקשות לקוח ישירות לערוץ הצוות.', type: 'webhook' },
    { id: 'sheets', name: 'Google Sheets', icon: FileSpreadsheet, color: 'bg-[#0f9d58]', desc: 'ייצא נתוני אנליטיקה וסטטיסטיקות פרסום באופן אוטומטי לגיליון נתונים.', type: 'oauth' },
  ];

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const orgSlug = routeInfo.orgSlug;
      const result = orgSlug
        ? await getAllIntegrationsStatusForWorkspace(orgSlug)
        : await getAllIntegrationsStatusForWorkspace('');
      if (result.success && result.data) {
        setIntegrations(result.data);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTesting(id);
    try {
      const result = await triggerWebhookEvent({
        eventType: 'test_ping',
        integrationName: id as 'make' | 'zapier',
        payload: {
          message: 'test',
          source: 'social_os',
        },
      });

      if (result.success) {
        onNotify('בדיקה נשלחה בהצלחה. בדוק שהתרחיש ב-Make/Zapier הופעל.', 'success');
      } else {
        onNotify(result.error || 'שגיאה בבדיקת החיבור', 'error');
      }
    } catch (error: any) {
      onNotify(error.message || 'שגיאה בבדיקת החיבור', 'error');
    } finally {
      setTesting(null);
    }
  };

  const getIntegrationStatus = (id: string) => {
    const integration = integrations.find(i => {
      const nameMap: Record<string, string> = {
        'calendar': 'google_calendar',
        'sheets': 'google_sheets',
      };
      return i.name === (nameMap[id] || id);
    });
    return integration?.is_connected || false;
  };

  const getLastSync = (id: string) => {
    const integration = integrations.find(i => {
      const nameMap: Record<string, string> = {
        'calendar': 'google_calendar',
        'sheets': 'google_sheets',
      };
      return i.name === (nameMap[id] || id);
    });
    return integration?.last_sync;
  };

  const handleConnect = async (id: string) => {
    const config = integrationConfigs.find(c => c.id === id);
    if (!config) return;

    try {
      if (config.type === 'oauth') {
        // Google OAuth flow
        let result;
        if (id === 'calendar') {
          result = await getGoogleCalendarAuthUrl();
        } else if (id === 'sheets') {
          result = await getGoogleSheetsAuthUrl();
        }

        if (result?.success && result.authUrl) {
          // Add state parameter with integration name
          const url = new URL(result.authUrl);
          url.searchParams.set('state', id === 'calendar' ? 'google_calendar' : 'google_sheets');
          window.location.href = url.toString();
        } else {
          onNotify(result?.error || 'שגיאה ביצירת קישור הרשאה', 'error');
        }
      } else if (config.type === 'webhook') {
        // Show webhook modal
        setShowModal(id);
        setModalData({ webhookUrl: '', events: ['post_published', 'post_approved', 'client_request'] });
      } else if (config.type === 'api_key') {
        // Show API key modal
        setShowModal(id);
        setModalData({ apiKey: '' });
      }
    } catch (error: any) {
      onNotify(error.message || 'שגיאה בחיבור', 'error');
    }
  };

  const handleSaveWebhook = async (id: string) => {
    try {
      const result = await saveWebhookConfig(
        id as 'zapier' | 'make',
        modalData.webhookUrl,
        modalData.events || []
      );

      if (result.success) {
        onNotify(`חובר ל-${integrationConfigs.find(c => c.id === id)?.name} בהצלחה! 🎉`);
        setShowModal(null);
        setModalData({});
        await loadIntegrations();
      } else {
        onNotify(result.error || 'שגיאה בשמירה', 'error');
      }
    } catch (error: any) {
      onNotify(error.message || 'שגיאה בשמירה', 'error');
    }
  };

  const handleSaveMorning = async () => {
    try {
      const orgSlug = routeInfo.orgSlug;
      if (!orgSlug) {
        onNotify('שגיאה: לא נמצא ארגון פעיל בכתובת', 'error');
        return;
      }

      const result = await saveMorningCredentialsForWorkspace(orgSlug, modalData.apiKey);

      if (result.success) {
        onNotify('חובר ל-Morning בהצלחה! 🎉');
        setShowModal(null);
        setModalData({});
        await loadIntegrations();
      } else {
        onNotify(result.error || 'שגיאה בשמירה', 'error');
      }
    } catch (error: any) {
      onNotify(error.message || 'שגיאה בשמירה', 'error');
    }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      let result;
      if (id === 'calendar') {
        result = await syncGoogleCalendar();
      }

      if (result?.success) {
        onNotify(`סנכרון ${integrationConfigs.find(c => c.id === id)?.name} הושלם בהצלחה!`);
        await loadIntegrations();
      } else {
        onNotify(result?.error || 'שגיאה בסנכרון', 'error');
      }
    } catch (error: any) {
      onNotify(error.message || 'שגיאה בסנכרון', 'error');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך להתנתק?')) return;

    try {
      const nameMap: Record<string, string> = {
        'calendar': 'google_calendar',
        'sheets': 'google_sheets',
      };
      const integrationName = nameMap[id] || id;

      const result = await disconnectIntegration(integrationName);

      if (result.success) {
        onNotify('התנתקות בוצעה בהצלחה');
        await loadIntegrations();
      } else {
        onNotify(result.error || 'שגיאה בהתנתקות', 'error');
      }
    } catch (error: any) {
      onNotify(error.message || 'שגיאה בהתנתקות', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Skeleton className="w-8 h-8 rounded-full bg-blue-100" />
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10 pb-20" dir="rtl">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-slate-800">מרכז אינטגרציות ואוטומציה</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {integrationConfigs.map((integration) => {
            const Icon = integration.icon;
            const isConnected = getIntegrationStatus(integration.id);
            const lastSync = getLastSync(integration.id);

            return (
              <div key={integration.id} className="bg-white p-8 rounded-[48px] border-2 border-slate-50 shadow-xl flex flex-col gap-6 relative overflow-hidden group">
                <div className="flex items-center justify-between relative z-10">
                  <div className={`w-14 h-14 ${integration.color} rounded-2xl flex items-center justify-center ${integration.color.includes('text-') ? '' : 'text-white'} shadow-lg`}>
                    <Icon size={28} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${isConnected ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isConnected ? 'מחובר' : 'לא מחובר'}
                  </span>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-black">{integration.name}</h3>
                </div>
                <div className="flex flex-col gap-3 relative z-10 mt-auto">
                  {!isConnected ? (
                    <button
                      onClick={() => handleConnect(integration.id)}
                      className={`w-full ${integration.color.includes('bg-') && !integration.color.includes('text-') ? integration.color : 'bg-blue-600'} ${integration.color.includes('text-') ? integration.color.split(' ')[integration.color.split(' ').length - 1] : 'text-white'} py-4 rounded-xl font-black text-xs shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2`}
                    >
                      חבר {integration.name.includes('Google') ? integration.name : `חשבון ${integration.name}`}
                      {(integration.id === 'calendar' || integration.id === 'zapier') && <ExternalLink size={14} />}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-green-600 font-black text-[10px] bg-green-50 p-3 rounded-xl">
                        <CheckCircle2 size={14} />
                        {integration.id === 'make' || integration.id === 'zapier' ? 'וובוק פעיל: Listening...' : 'מסונכרן בזמן אמת'}
                      </div>
                      {(integration.id === 'make' || integration.id === 'zapier') && (
                        <button
                          onClick={() => handleTestWebhook(integration.id)}
                          disabled={testing === integration.id}
                          className="w-full bg-slate-50 text-slate-700 py-2 rounded-xl font-black text-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {testing === integration.id ? (
                            <>
                              <Skeleton className="w-3 h-3 rounded-full" />
                              בודק...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={12} />
                              בדיקת חיבור
                            </>
                          )}
                        </button>
                      )}
                      {integration.id === 'calendar' && (
                        <button
                          onClick={() => handleSync(integration.id)}
                          disabled={syncing === integration.id}
                          className="w-full bg-blue-50 text-blue-600 py-2 rounded-xl font-black text-[10px] hover:bg-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {syncing === integration.id ? (
                            <>
                              <Skeleton className="w-3 h-3 rounded-full" />
                              מסנכרן...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={12} />
                              סנכרן עכשיו
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="w-full bg-red-50 text-red-600 py-2 rounded-xl font-black text-[10px] hover:bg-red-100 transition-all"
                      >
                        התנתק
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Webhook Modal */}
      {showModal && (showModal === 'make' || showModal === 'zapier') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black">חיבור {integrationConfigs.find(c => c.id === showModal)?.name}</h3>
              <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-black mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={modalData.webhookUrl || ''}
                  onChange={(e) => setModalData({ ...modalData, webhookUrl: e.target.value })}
                  placeholder="כתובת Webhook"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2">אירועים (Events)</label>
                <div className="flex flex-col gap-2">
                  {['post_published', 'post_approved', 'client_request', 'payment_received', 'task_completed', 'test_ping'].map(event => (
                    <label key={event} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={modalData.events?.includes(event) || false}
                        onChange={(e) => {
                          const events = modalData.events || [];
                          if (e.target.checked) {
                            setModalData({ ...modalData, events: [...events, event] });
                          } else {
                            setModalData({ ...modalData, events: events.filter((ev: string) => ev !== event) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleSaveWebhook(showModal)}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black hover:bg-blue-700 transition-all"
              >
                שמור וחבר
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Morning API Key Modal */}
      {showModal === 'morning' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black">חיבור Morning</h3>
              <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-black mb-2">API Key</label>
                <input
                  type="password"
                  value={modalData.apiKey || ''}
                  onChange={(e) => setModalData({ ...modalData, apiKey: e.target.value })}
                  placeholder="הכנס את מפתח ה-API מ-Morning"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSaveMorning}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-black hover:bg-green-700 transition-all"
              >
                שמור וחבר
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

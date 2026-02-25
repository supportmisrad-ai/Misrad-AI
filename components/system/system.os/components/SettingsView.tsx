
import React, { useState, useEffect, useCallback } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { 
    User, Bell, Shield, Building, Mail, Smartphone, 
    SquareActivity, CreditCard, Users, Plus, Trash2, Check, 
    Globe, Lock, LogOut, Receipt, FileText, TriangleAlert, 
    Kanban, GripVertical, Save, Cpu, ToggleLeft, ToggleRight, Target,
    FileInput, Zap, ExternalLink, BrainCircuit, Loader2, Info,
    Phone, ShoppingBag, MessageSquareText, Lightbulb, BookOpenText
} from 'lucide-react';
import Link from 'next/link';
import { INITIAL_AGENTS, STAGES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBrand } from '../contexts/BrandContext';
import SystemTargetsView from './SalesTargetsView';
import { Lead } from '../types';

interface SettingsViewProps {
  logs?: unknown[]; 
  leads?: Lead[];
  orgSlug?: string;
}

type SettingsTabId = 'general' | 'targets' | 'pipeline' | 'team' | 'billing' | 'notifications' | 'ai_sales';

interface AiSalesContextData {
  businessDescription: string;
  productsAndServices: string;
  targetAudience: string;
  salesApproach: string;
  salesScripts: string;
  commonObjections: string;
  specialInstructions: string;
}

const EMPTY_SALES_CONTEXT: AiSalesContextData = {
  businessDescription: '',
  productsAndServices: '',
  targetAudience: '',
  salesApproach: '',
  salesScripts: '',
  commonObjections: '',
  specialInstructions: '',
};

const SettingsView: React.FC<SettingsViewProps> = ({ leads = [], orgSlug = '' }) => {
  const { canAccess, user, isSuperAdmin, isTenantAdmin } = useAuth();
  const { addToast } = useToast();
  const { brandName, brandLogo, setBrandName, setBrandLogo } = useBrand();
  
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [teamMembers, setTeamMembers] = useState(INITIAL_AGENTS);
  
  // Local state for brand editing
  const [tempName, setTempName] = useState(brandName);
  const [tempLogo, setTempLogo] = useState<string | null>(brandLogo);

  // Sync when context changes (if updated elsewhere)
  useEffect(() => {
      setTempName(brandName);
      setTempLogo(brandLogo);
  }, [brandName, brandLogo]);
  
  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState([
    { title: 'ליד נפתח', desc: 'קבל עדכון ברגע שלקוח משאיר פרטים', email: true, push: true },
    { title: 'משימות ופולואפ', desc: 'כשמנהל מעביר אליך משימה או שהגיע זמן לפולואפ', email: true, push: true },
    { title: 'דוח יומי במייל', desc: 'סיכום מספרים כל בוקר ב-08:00', email: true, push: false },
    { title: 'עדכוני מערכת', desc: 'חידושים ותחזוקה', email: false, push: true },
  ]);

  const toggleNotifPref = (idx: number, field: 'email' | 'push') => {
    setNotifPrefs((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: !item[field] } : item));
  };

  // AI Sales Context state
  const [aiSalesContext, setAiSalesContext] = useState<AiSalesContextData>(EMPTY_SALES_CONTEXT);
  const [aiSalesLoading, setAiSalesLoading] = useState(false);
  const [aiSalesSaving, setAiSalesSaving] = useState(false);
  const [aiSalesLoaded, setAiSalesLoaded] = useState(false);

  const loadAiSalesContext = useCallback(async () => {
    if (!orgSlug || aiSalesLoaded) return;
    setAiSalesLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/ai-sales-context`);
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as Record<string, unknown>;
      const nested = (json?.data && typeof json.data === 'object' ? json.data : json) as Record<string, unknown>;
      const ctx = (nested?.aiSalesContext && typeof nested.aiSalesContext === 'object' ? nested.aiSalesContext : {}) as Record<string, unknown>;
      setAiSalesContext({
        businessDescription: String(ctx.businessDescription || ''),
        productsAndServices: String(ctx.productsAndServices || ''),
        targetAudience: String(ctx.targetAudience || ''),
        salesApproach: String(ctx.salesApproach || ''),
        salesScripts: String(ctx.salesScripts || ''),
        commonObjections: String(ctx.commonObjections || ''),
        specialInstructions: String(ctx.specialInstructions || ''),
      });
      setAiSalesLoaded(true);
    } catch {
      // silent – first time
    } finally {
      setAiSalesLoading(false);
    }
  }, [orgSlug, aiSalesLoaded]);

  useEffect(() => {
    if (activeTab === 'ai_sales') {
      void loadAiSalesContext();
    }
  }, [activeTab, loadAiSalesContext]);

  const saveAiSalesContext = async () => {
    if (!orgSlug) return;
    setAiSalesSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/ai-sales-context`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ aiSalesContext }),
      });
      if (!res.ok) throw new Error('Failed to save');
      addToast('הנחיות AI למכירות נשמרו בהצלחה', 'success');
    } catch {
      addToast('שגיאה בשמירת הנחיות AI', 'error');
    } finally {
      setAiSalesSaving(false);
    }
  };

  const updateSalesField = (field: keyof AiSalesContextData, value: string) => {
    setAiSalesContext(prev => ({ ...prev, [field]: value }));
  };

  // Rule 1: Dynamic Configuration State (Simulated)
  const [editableStages, setEditableStages] = useState(STAGES);

  const handleSave = () => {
      setBrandName(tempName);
      setBrandLogo(tempLogo);
      addToast('הגדרות נשמרו בהצלחה', 'success');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setTempLogo(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange?: () => void }) => (
      <div
          role="switch"
          aria-checked={checked}
          tabIndex={0}
          onClick={onChange}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange?.(); } }}
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-300 cursor-pointer ${checked ? 'bg-primary' : 'bg-slate-200'}`}
          dir="ltr"
      >
          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
      </div>
  );

  const getAgentStatusText = (status: string) => {
      switch(status) {
          case 'available': return 'זמין';
          case 'busy': return 'עסוק';
          case 'offline': return 'מנותק';
          default: return status;
      }
  };

  // Filter Tabs based on RBAC
  const TABS = (
    [
      { id: 'general', label: 'על העסק', icon: Building, desc: 'פרטים ומיתוג', allowed: true },
      { id: 'targets', label: 'יעדים', icon: Target, desc: 'ניהול יעדי מכירות', allowed: true },
      { id: 'pipeline', label: 'תהליך המכירה', icon: Kanban, desc: 'עריכת שלבים', allowed: canAccess('settings_team') },
      { id: 'team', label: 'צוות והרשאות', icon: Users, desc: 'מי במערכת', allowed: canAccess('settings_team') },
      { id: 'billing', label: 'תוכנית ותשלום', icon: CreditCard, desc: 'חשבוניות', allowed: canAccess('billing') },
      { id: 'ai_sales', label: 'AI מאמן מכירות', icon: BrainCircuit, desc: 'הנחיות למנוע הניתוח', allowed: true },
      { id: 'notifications', label: 'התראות', icon: Bell, desc: 'מתי להציק לך', allowed: true },
    ] satisfies Array<{
      id: SettingsTabId;
      label: string;
      icon: React.ComponentType<{ size?: number; className?: string }>;
      desc: string;
      allowed: boolean;
    }>
  ).filter((tab) => tab.allowed);

  const userRole = user?.role;
  const hasFullAccess = isSuperAdmin || isTenantAdmin || (userRole as unknown as string) === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <Cpu size={24} className="text-slate-400" />
                הגדרות מערכת
            </h2>
        </div>
        {userRole && !hasFullAccess && (
             <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                 <Shield size={16} />
                 גישה מוגבלת ({(userRole as unknown as string) === 'agent' ? 'סוכן' : 'צופה'})
             </div>
        )}
      </div>

      {/* Quick Tools Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link
          href={orgSlug ? `/w/${encodeURIComponent(orgSlug)}/system/forms` : '#'}
          className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
            <FileInput size={16} />
          </div>
          טפסים
          <ExternalLink size={12} className="text-slate-300 group-hover:text-slate-400" />
        </Link>
        <Link
          href={orgSlug ? `/w/${encodeURIComponent(orgSlug)}/system/automations` : '#'}
          className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
            <Zap size={16} />
          </div>
          אוטומציות
          <ExternalLink size={12} className="text-slate-300 group-hover:text-slate-400" />
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          
          {/* Settings Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                  <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ניווט</div>
                  </div>
                  <div className="p-2 space-y-1">
                      {TABS.map(tab => (
                          <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right group ${
                                  activeTab === tab.id 
                                  ? 'bg-rose-50 text-primary shadow-sm ring-1 ring-rose-100' 
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                              <div className={`p-2 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                                  <tab.icon size={18} />
                              </div>
                              <div>
                                  <div className="font-bold text-sm">{tab.label}</div>
                                  <div className="text-[10px] text-slate-400 font-medium hidden xl:block">{tab.desc}</div>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
              
              {/* TARGETS TAB */}
              {activeTab === 'targets' && (
                  <div className="animate-slide-up h-full">
                      <SystemTargetsView leads={leads} />
                  </div>
              )}

              {/* GENERAL TAB */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-slide-up">
                    
                    {/* Brand Settings */}
                    <div className="ui-card overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Building size={20} className="text-primary" />
                                מיתוג המערכת
                            </h3>
                        </div>
                        <div className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Logo Upload */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                        {tempLogo ? (
                                            <img src={tempLogo} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Target size={32} className="text-slate-300" />
                                        )}
                                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold">
                                            החלף לוגו
                                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                        </label>
                                    </div>
                                    <div className="text-xs text-slate-400">מומלץ: PNG שקוף</div>
                                </div>

                                {/* Fields */}
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">שם המערכת (העסק)</label>
                                        <input 
                                            type="text" 
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            className="w-full" 
                                            placeholder="שם העסק שלך"
                                        />
                                        <p className="text-xs text-slate-400">זה השם שיופיע בראש התפריט ובמסך הכניסה.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ui-card overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Globe size={20} className="text-primary" />
                                שפה ומטבע
                            </h3>
                        </div>
                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">שפת מערכת</label>
                                    <CustomSelect
                                        value="עברית"
                                        onChange={() => {}}
                                        options={[
                                            { value: 'עברית', label: 'עברית' },
                                            { value: 'אנגלית', label: 'אנגלית' },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">מטבע ראשי</label>
                                    <CustomSelect
                                        value="₪ שקל חדש"
                                        onChange={() => {}}
                                        options={[
                                            { value: '₪ שקל חדש', label: '₪ שקל חדש' },
                                            { value: '$ דולר אמריקאי', label: '$ דולר אמריקאי' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleSave}
                            className="bg-onyx-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2 hover:-translate-y-0.5"
                        >
                            <Save size={18} /> שמור הגדרות
                        </button>
                    </div>
                </div>
              )}

              {/* PIPELINE CONFIG TAB */}
              {activeTab === 'pipeline' && canAccess('settings_team') && (
                <div className="space-y-6 animate-slide-up">
                    <div className="ui-card overflow-hidden">
                         <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Kanban size={20} className="text-primary" />
                                    עורך השלבים
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">איך נראה תהליך המכירה שלך?</p>
                            </div>
                            <button className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                <Plus size={14} /> הוסף שלב
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-3">
                            {editableStages.map((stage, index) => (
                                <div key={stage.id} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-rose-100 transition-all group cursor-move">
                                    <div className="text-slate-300 cursor-grab hover:text-primary">
                                        <GripVertical size={20} />
                                    </div>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-slate-50 border border-slate-200 text-slate-600">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">שם השלב</div>
                                        <input 
                                            type="text" 
                                            className="font-bold text-slate-800 bg-transparent focus:bg-rose-50 focus:px-2 rounded border-transparent border focus:border-rose-200 outline-none w-full transition-all py-1" 
                                            defaultValue={stage.label} 
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-4 h-4 rounded-full ${stage.accent}`}></div>
                                        <button className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              )}

              {/* TEAM TAB */}
              {activeTab === 'team' && canAccess('settings_team') && (
                <div className="space-y-6 animate-slide-up">
                    <div className="ui-card overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users size={20} className="text-primary" />
                                ניהול משתמשים
                            </h3>
                            <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary-dark transition-colors shadow-lg shadow-rose-200">
                                <Plus size={14} /> הזמן איש צוות
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">עובד</th>
                                        <th className="px-6 py-4">תפקיד</th>
                                        <th className="px-6 py-4">סטטוס</th>
                                        <th className="px-6 py-4">נראה לאחרונה</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {teamMembers.map((agent, index) => (
                                        <tr key={agent.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm border border-slate-200 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        {agent.avatar}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{agent.name}</div>
                                                        <div className="text-xs text-slate-400">{agent.id}@nexus.os</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-white text-slate-600 px-2 py-1 rounded-md text-xs font-bold border border-slate-200 shadow-sm">
                                                    {index === 0 ? 'מנהל' : 'סוכן'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${agent.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                    <span className="text-slate-600 font-medium text-xs">{getAgentStatusText(agent.status)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                                {new Date().toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-left">
                                                <button className="text-slate-300 hover:text-slate-600 transition-colors p-2">
                                                    <Lock size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
              )}

              {/* BILLING TAB */}
              {activeTab === 'billing' && canAccess('billing') && (
                <div className="space-y-6 animate-slide-up">
                    
                    {/* Plan Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-onyx-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 blur-3xl rounded-full pointer-events-none"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-widest mb-2">
                                            <SquareActivity size={14} /> המסלול שלך
                                        </div>
                                        <h3 className="text-3xl font-bold">עסקי מתקדם</h3>
                                    </div>
                                    <span className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-sm font-bold">—</span>
                                </div>
                                
                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-sm text-slate-300 mb-1">
                                        <span>משתמשים פעילים</span>
                                        <span className="text-white font-bold">—</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <div className="bg-rose-500 h-full w-0 rounded-full"></div>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm text-slate-300 mb-1 pt-2">
                                        <span>נפח אחסון</span>
                                        <span className="text-white font-bold">—</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-0 rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-rose-50 transition-colors relative z-10 flex items-center justify-center gap-2">
                                שדרג לחבילה ארגונית <Receipt size={16} />
                            </button>
                        </div>
                        
                        <div className="ui-card p-8 flex flex-col">
                             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                <CreditCard size={20} className="text-slate-400" />
                                אמצעי תשלום
                            </h3>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 group cursor-pointer hover:border-rose-200 transition-colors">
                                <div className="w-12 h-8 bg-white rounded-md border border-slate-200 shadow-sm flex items-center justify-center">
                                    <div className="w-6 h-4 bg-red-500/20 rounded-sm"></div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700">אין כרטיס שמור</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        <Check size={10} className="text-emerald-500" /> כרטיס ראשי
                                    </div>
                                </div>
                            </div>
                            <button className="mt-auto w-full border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                <Plus size={16} /> הוסף כרטיס
                            </button>
                        </div>
                    </div>

                    {/* Invoice History */}
                    <div className="ui-card overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={20} className="text-primary" />
                                היסטוריית תשלומים
                            </h3>
                        </div>
                        <div className="p-10 text-center text-slate-400 font-bold">
                            אין עדיין תשלומים להצגה
                        </div>
                    </div>
                </div>
              )}

              {/* AI SALES COACH TAB */}
              {activeTab === 'ai_sales' && (
                <div className="space-y-6 animate-slide-up">
                    {/* Explainer Card */}
                    <div className="bg-gradient-to-br from-rose-50 to-indigo-50 border border-rose-200 rounded-3xl p-6 md:p-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-100 rounded-2xl shrink-0">
                                <Lightbulb size={24} className="text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-indigo-900 mb-2">למה זה חשוב?</h3>
                                <p className="text-sm text-indigo-800 leading-relaxed mb-3">
                                    כשאתה מזין מידע על העסק, סגנון המכירה, והמוצרים שלך – ה-AI של מנתח השיחות והחייגן הופך <strong>ממאמן גנרי למאמן שמכיר את העסק שלך לעומק</strong>.
                                </p>
                                <ul className="text-sm text-indigo-700 space-y-1.5">
                                    <li className="flex items-start gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> <span>ניתוח שיחות יתייחס למוצרים ולשירותים הספציפיים שלך</span></li>
                                    <li className="flex items-start gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> <span>הצעות מענה להתנגדויות יתבססו על תסריטי המכירה שלך</span></li>
                                    <li className="flex items-start gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> <span>המאמן החי (Live Coach) ייתן טיפים רלוונטיים לקהל היעד שלך</span></li>
                                    <li className="flex items-start gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> <span>ציון השיחה ישקף את סטנדרט המכירה שאתה מגדיר</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {aiSalesLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Business Description */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Building size={20} className="text-indigo-500" />
                                    תיאור העסק
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">ספר ל-AI מי אתה ומה העסק שלך עושה</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={aiSalesContext.businessDescription}
                                    onChange={(e) => updateSalesField('businessDescription', e.target.value)}
                                    rows={4}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none transition-all"
                                    placeholder="דוגמה: אנחנו חברת שיפוצים מוגבלת בע״מ שמתמחה בשיפוצי דירות יוקרה באזור המרכז. פועלים מ-2018, 12 עובדים, תקציב ממוצע לפרויקט 150-400 אלף ₪."
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Products & Services */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <ShoppingBag size={20} className="text-emerald-500" />
                                    מוצרים ושירותים
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">מה אתה מוכר? פרט מחירים, חבילות, יתרונות</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={aiSalesContext.productsAndServices}
                                    onChange={(e) => updateSalesField('productsAndServices', e.target.value)}
                                    rows={5}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none transition-all"
                                    placeholder="דוגמה:\n- שיפוץ דירה מלא: 150-400 אלף ₪ (כולל תכנון, ביצוע, ליווי)\n- שיפוץ מטבח: 40-80 אלף ₪\n- שיפוץ חדר אמבטיה: 25-50 אלף ₪\nיתרון מרכזי: אחריות 5 שנים, מנהל פרויקט צמוד"
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Target Audience */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Users size={20} className="text-amber-500" />
                                    קהל יעד
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">מי הלקוחות שלך? מה חשוב להם?</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={aiSalesContext.targetAudience}
                                    onChange={(e) => updateSalesField('targetAudience', e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none transition-all"
                                    placeholder="דוגמה: זוגות צעירים שרוכשים דירה ראשונה, משפחות מבוססות שרוצות שדרוג, משקיעי נדל״ן. חשוב להם: אמינות, עמידה בלוחות זמנים, שקיפות תקציבית."
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Sales Approach */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Phone size={20} className="text-rose-500" />
                                    סגנון וגישת מכירה
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">איך אתה מוכר? מה הגישה שלך? מה עובד?</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={aiSalesContext.salesApproach}
                                    onChange={(e) => updateSalesField('salesApproach', e.target.value)}
                                    rows={4}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none transition-all"
                                    placeholder="דוגמה: אנחנו לא לוחצים – בונים אמון. השיחה הראשונה היא תמיד ייעוצית, בלי לדבר על מחיר. מזמינים לפגישה באתר. המרה טובה כשהלקוח מרגיש שהבנו את הצרכים שלו."
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Sales Scripts */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpenText size={20} className="text-blue-500" />
                                    תסריטי מכירה
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">הדבק את תסריטי המכירה / משפטי מפתח שאתה משתמש בהם</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={aiSalesContext.salesScripts}
                                    onChange={(e) => updateSalesField('salesScripts', e.target.value)}
                                    rows={6}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none transition-all font-mono text-xs"
                                    placeholder={'דוגמה:\nפתיחה: "שלום [שם], כאן [שם] מ[חברה]. ראיתי שהשארת פרטים לגבי שיפוץ – אשמח לשמוע מה בדיוק אתם מחפשים."\nמעבר לפגישה: "בואו נקבע פגישת ייעוץ קצרה באתר – זה בלי התחייבות, רק כדי שנבין מה הצרכים."\nסגירה: "אני שולח לך הצעה מסודרת עד [תאריך], ונדבר שוב."'}
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Common Objections */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <MessageSquareText size={20} className="text-orange-500" />
                                    התנגדויות נפוצות ותשובות
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">מה הלקוחות אומרים ואיך אתה עונה? ה-AI ישתמש בזה לייצר מענה מותאם</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={aiSalesContext.commonObjections}
                                    onChange={(e) => updateSalesField('commonObjections', e.target.value)}
                                    rows={5}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none transition-all"
                                    placeholder={'דוגמה:\n"יקר לי" → "אני מבין. בואו נראה מה באמת חשוב לכם ונתאים חבילה. הרבה לקוחות שלנו חסכו בסוף כי הכל נעשה נכון מהפעם הראשונה."\n"אני צריך לחשוב" → "בהחלט, קחו את הזמן. אני שולח סיכום קצר במייל ונדבר שוב בתחילת השבוע?"\n"יש לי כבר קבלן" → "מעולה, כדאי תמיד להשוות. אשמח לתת הצעה שתוכלו לבדוק מולו."'}
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Special Instructions */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Info size={20} className="text-rose-500" />
                                    הוראות מיוחדות ל-AI
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">הנחיות נוספות, דגשים, מה לא לומר, טון דיבור מועדף</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={aiSalesContext.specialInstructions}
                                    onChange={(e) => updateSalesField('specialInstructions', e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-none transition-all"
                                    placeholder="דוגמה: תמיד להדגיש את האחריות של 5 שנים. לא להזכיר מתחרים בשם. הטון צריך להיות מקצועי אבל חם. אם הלקוח מדבר על תקציב נמוך – לא לוותר, להציע פתרון מדורג."
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4 pb-8">
                            <button
                                onClick={saveAiSalesContext}
                                disabled={aiSalesSaving}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {aiSalesSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {aiSalesSaving ? 'שומר...' : 'שמור הנחיות AI'}
                            </button>
                        </div>
                      </>
                    )}
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'notifications' && (
                  <div className="space-y-6 animate-slide-up">
                      <div className="ui-card p-6 md:p-8">
                          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                              <Bell size={20} className="text-primary" />
                              על מה להודיע לך?
                          </h3>
                          <div className="space-y-6">
                              {notifPrefs.map((setting, idx) => (
                                  <div key={idx} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 border-b border-slate-100 last:border-0">
                                      <div>
                                          <div className="font-bold text-slate-800">{setting.title}</div>
                                          <div className="text-sm text-slate-500">{setting.desc}</div>
                                      </div>
                                      <div className="flex gap-6">
                                          <label className="flex items-center gap-3 cursor-pointer group">
                                              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800">מייל</span>
                                              <Toggle checked={setting.email} onChange={() => toggleNotifPref(idx, 'email')} />
                                          </label>
                                          <label className="flex items-center gap-3 cursor-pointer group">
                                              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800">אפליקציה</span>
                                              <Toggle checked={setting.push} onChange={() => toggleNotifPref(idx, 'push')} />
                                          </label>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default SettingsView;

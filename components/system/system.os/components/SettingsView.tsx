
import React, { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { 
    User, Bell, Shield, Building, Mail, Smartphone, 
    SquareActivity, CreditCard, Users, Plus, Trash2, Check, 
    Globe, Lock, LogOut, Receipt, FileText, TriangleAlert, 
    Kanban, GripVertical, Save, Cpu, ToggleLeft, ToggleRight, Target
} from 'lucide-react';
import { INITIAL_AGENTS, STAGES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBrand } from '../contexts/BrandContext';
import SystemTargetsView from './SalesTargetsView';
import { Lead } from '../types';

interface SettingsViewProps {
  logs?: unknown[]; 
  leads?: Lead[];
}

type SettingsTabId = 'general' | 'targets' | 'pipeline' | 'team' | 'billing' | 'notifications';

const SettingsView: React.FC<SettingsViewProps> = ({ leads = [] }) => {
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

  const Toggle = ({ checked }: { checked: boolean }) => (
      <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-300 ${checked ? 'bg-primary' : 'bg-slate-200'}`} dir="ltr">
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
                                <Building size={20} className="text-slate-400" />
                                פרטי עסק (חשבוניות)
                            </h3>
                        </div>
                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">ח.פ / עוסק</label>
                                    <input type="text" defaultValue="" className="w-full" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-slate-700">כתובת (לחשבוניות)</label>
                                    <input type="text" defaultValue="" className="w-full" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">מייל ראשי</label>
                                    <input type="email" defaultValue="" className="w-full" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">טלפון ראשי</label>
                                    <input type="tel" defaultValue="" className="w-full" />
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

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'notifications' && (
                  <div className="space-y-6 animate-slide-up">
                      <div className="ui-card p-6 md:p-8">
                          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                              <Bell size={20} className="text-primary" />
                              על מה להודיע לך?
                          </h3>
                          <div className="space-y-6">
                              {[
                                  { title: 'ליד נפתח', desc: 'קבל עדכון ברגע שלקוח משאיר פרטים', email: true, push: true },
                                  { title: 'משימות ופולואפ', desc: 'כשמנהל מעביר אליך משימה או שהגיע זמן לפולואפ', email: true, push: true },
                                  { title: 'דוח יומי במייל', desc: 'סיכום מספרים כל בוקר ב-08:00', email: true, push: false },
                                  { title: 'עדכוני מערכת', desc: 'חידושים ותחזוקה', email: false, push: true }
                              ].map((setting, idx) => (
                                  <div key={idx} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 border-b border-slate-100 last:border-0">
                                      <div>
                                          <div className="font-bold text-slate-800">{setting.title}</div>
                                          <div className="text-sm text-slate-500">{setting.desc}</div>
                                      </div>
                                      <div className="flex gap-6">
                                          <label className="flex items-center gap-3 cursor-pointer group">
                                              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800">מייל</span>
                                              <Toggle checked={setting.email} />
                                          </label>
                                          <label className="flex items-center gap-3 cursor-pointer group">
                                              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800">אפליקציה</span>
                                              <Toggle checked={setting.push} />
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

import React, { useState, useEffect } from 'react';
import { Client } from '@/components/client-portal/types';
import { useNexus } from '@/components/client-portal/context/ClientContext';
import {
  Eye,
  RefreshCw,
  Target,
  ClipboardList,
  FolderOpen,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  FileText,
  Upload,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { generateSuccessRecommendation } from '@/components/client-portal/services/geminiService';
import { Skeleton } from '@/components/ui/skeletons';

interface PortalManagementTabProps {
  client: Client;
}

export const PortalManagementTab: React.FC<PortalManagementTabProps> = ({ client }) => {
  const { updateClientGoal, addClientTask, removeClientTask, syncPortal } = useNexus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', type: 'APPROVAL' as any, isBlocking: false });
  const [recommendation, setRecommendation] = useState<{ tip: string; expectedBenefit: string } | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);

  useEffect(() => {
    fetchRecommendation();
  }, [client.id]);

  const fetchRecommendation = async () => {
    setIsLoadingRec(true);
    try {
      const rec = await generateSuccessRecommendation(client.name, client.healthScore);
      setRecommendation(rec);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRec(false);
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    syncPortal(client.id);
    setTimeout(() => {
      setIsSyncing(false);
      window.dispatchEvent(
        new CustomEvent('nexus-toast', {
          detail: { message: 'הפורטל סונכרן בהצלחה! הלקוח קיבל הודעה על עדכון.', type: 'success' },
        })
      );
    }, 1200);
  };

  const handleGoalUpdate = (goalId: string, current: number) => {
    updateClientGoal(client.id, goalId, { metricCurrent: current });
  };

  const handleAddTask = () => {
    if (!newTask.title) return;
    addClientTask(client.id, {
      ...newTask,
      dueDate: 'ASAP',
    });
    setShowTaskForm(false);
    setNewTask({ title: '', description: '', type: 'APPROVAL', isBlocking: false });
  };

  return (
    <div className="space-y-10 animate-slide-up pb-20">
      <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-nexus-accent/10 rounded-2xl flex items-center justify-center text-nexus-accent">
            <Globe size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">ניהול פורטל הלקוח</h3>
            <p className="text-gray-500">שלוט במידע, במשימות וביחסים עם {client.name}.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-client-portal', { detail: client.id }))}
            className="flex-1 md:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Eye size={18} /> תצוגת לקוח
          </button>
          <GlowButton onClick={handleSync} isLoading={isSyncing} className="flex-1 md:flex-none">
            <RefreshCw size={18} className={isSyncing ? 'opacity-60' : ''} /> סנכרן פורטל
          </GlowButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 text-nexus-accent mb-6">
              <Sparkles size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Nexus Owner Insight</span>
            </div>
            {isLoadingRec ? (
              <div className="flex-1 flex flex-col justify-center gap-3">
                <Skeleton className="h-6 w-5/6 rounded-xl bg-white/10" />
                <Skeleton className="h-6 w-4/6 rounded-xl bg-white/10" />
                <Skeleton className="h-4 w-3/6 rounded-xl bg-white/10" />
              </div>
            ) : (
              <>
                <h4 className="text-xl font-bold leading-tight mb-4 italic">"{recommendation?.tip}"</h4>
                <div className="mt-auto flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <div className="p-2 bg-nexus-accent/20 rounded-lg">
                    <TrendingUp size={16} className="text-nexus-accent" />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-bold block">תועלת עסקית צפויה</span>
                    <span className="text-sm font-bold">{recommendation?.expectedBenefit}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-nexus-primary mb-6">
            <Lightbulb size={20} className="text-nexus-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest">טיפ לשימור לקוח</span>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6">
            הלקוחות שלנו מעריכים שקיפות. ככל שהם רואים את המדדים בזמן אמת, רמת האמון עולה וזמן הטיפול בהתנגדויות יורד ב-30%.
          </p>
          <div className="mt-auto flex justify-between items-center text-xs font-bold text-nexus-accent">
            <span>נקסוס עוזר לך להפוך ליועץ, לא רק ספק.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h4 className="font-bold text-lg flex items-center gap-2">
              <Target size={20} className="text-nexus-accent" /> יעדים להצגה בפורטל
            </h4>
          </div>

          <div className="space-y-4">
            {client.successGoals.map((goal) => (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h5 className="font-bold text-gray-900">{goal.title}</h5>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      יעד סופי: {goal.metricTarget}
                      {goal.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400">הצג בפורטל</span>
                    <div className="w-10 h-6 bg-nexus-primary rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1.5">עדכן מצב נוכחי ({goal.unit})</label>
                    <input
                      type="number"
                      defaultValue={goal.metricCurrent}
                      onBlur={(e) => handleGoalUpdate(goal.id, parseFloat(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-mono font-bold text-lg focus:bg-white focus:border-nexus-accent transition-all outline-none"
                    />
                  </div>
                  <div className="w-32 h-14 bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-white/10 text-white shadow-xl">
                    <span className="text-[10px] font-bold text-nexus-accent uppercase">השלמה</span>
                    <span className="text-lg font-black">{Math.round((goal.metricCurrent / goal.metricTarget) * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h4 className="font-bold text-lg flex items-center gap-2">
              <ClipboardList size={20} className="text-nexus-primary" /> משימות פתוחות ללקוח
            </h4>
            <button
              onClick={() => setShowTaskForm(true)}
              className="p-2 bg-nexus-primary text-white rounded-lg hover:bg-nexus-accent transition-colors shadow-lg shadow-nexus-primary/20"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="bg-gray-100/50 rounded-[40px] p-6 space-y-4 min-h-[300px]">
            {showTaskForm && (
              <div className="bg-white border-2 border-nexus-accent rounded-3xl p-5 shadow-2xl animate-slide-up space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">מה צריך לקרות?</label>
                  <input
                    placeholder="כותרת המשימה..."
                    className="w-full font-bold text-sm outline-none border-b border-gray-100 pb-2 focus:border-nexus-accent transition-colors"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex-1 text-[10px] font-bold bg-gray-50 p-2.5 rounded-xl outline-none border border-gray-100"
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
                  >
                    <option value="APPROVAL">אישור תוצר</option>
                    <option value="UPLOAD">העלאת קובץ</option>
                    <option value="SIGNATURE">חתימה</option>
                    <option value="FORM">מילוי שאלון</option>
                  </select>
                  <button
                    onClick={() => setNewTask({ ...newTask, isBlocking: !newTask.isBlocking })}
                    className={`px-4 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                      newTask.isBlocking ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    חוסם?
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowTaskForm(false)} className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                    ביטול
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="flex-1 py-3 bg-nexus-primary text-white rounded-xl text-xs font-bold shadow-lg hover:bg-nexus-accent transition-all"
                  >
                    הזרק לפורטל
                  </button>
                </div>
              </div>
            )}

            {client.pendingActions.filter((a) => a.status === 'PENDING').map((action) => (
              <div key={action.id} className="bg-white p-5 rounded-3xl border border-gray-200 flex items-center justify-between group shadow-sm hover:border-nexus-accent transition-all">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-2xl ${
                      action.isBlocking ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'
                    } group-hover:scale-110 transition-transform`}
                  >
                    <Zap size={16} fill={action.isBlocking ? 'currentColor' : 'none'} />
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-gray-900">{action.title}</h6>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{action.type}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeClientTask(client.id, action.id)}
                  className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-gray-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {client.pendingActions.filter((a) => a.status === 'PENDING').length === 0 && !showTaskForm && (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 italic text-sm text-center">
                <ClipboardList size={40} className="mb-4 opacity-20" />
                <p>
                  אין משימות פתוחות ללקוח בפורטל.
                  <br />
                  זה זמן טוב להוסיף משהו!
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-12 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h4 className="font-bold text-lg flex items-center gap-2">
              <FolderOpen size={20} className="text-nexus-accent" /> ניהול הכספת (Vault)
            </h4>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-nexus-primary text-white rounded-2xl text-xs font-bold hover:bg-nexus-accent transition-all shadow-lg shadow-nexus-primary/20">
              <Upload size={18} /> העלה קובץ חדש
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-[32px] overflow-hidden shadow-sm">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">שם הקובץ</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">קטגוריה</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">הועלה ע"י</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">תאריך</th>
                  <th className="px-8 py-5 text-left">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {client.assets?.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-400">
                          <FileText size={18} />
                        </div>
                        <span className="font-bold text-sm text-gray-800">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200 font-bold uppercase tracking-tighter">{asset.category}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          asset.uploadedBy === 'AGENCY' ? 'bg-nexus-accent/10 text-nexus-accent' : 'bg-blue-50 text-blue-500'
                        }`}
                      >
                        {asset.uploadedBy === 'AGENCY' ? 'הסוכנות' : 'הלקוח'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs text-gray-400 font-mono">{asset.date}</td>
                    <td className="px-8 py-5 text-left">
                      <button className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {client.assets.length === 0 && <div className="py-20 text-center text-gray-400 italic">הכספת ריקה</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

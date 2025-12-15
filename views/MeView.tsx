
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Settings, Shield, Bell, LogOut, CreditCard, X, Camera, Activity, Clock, MapPin, MapPinned, Timer, ChevronDown, Crown, Zap, Flame, Wallet, Trophy, TrendingUp } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HoldButton } from '../components/HoldButton';
import { LeadStatus, Status } from '../types';

// Imported Settings Components
import { PersonalSettings } from '../components/me/PersonalSettings';
import { NotificationSettings } from '../components/me/NotificationSettings';
import { SecuritySettings } from '../components/me/SecuritySettings';
import { BillingSettings } from '../components/me/BillingSettings';

export const MeView: React.FC = () => {
  const { currentUser, logout, tasks, activeShift, clockIn, clockOut, timeEntries, leads } = useData();
  const navigate = useNavigate();
  const [activeSettingModal, setActiveSettingModal] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Timer State
  const [elapsed, setElapsed] = useState('00:00:00');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Stats Calculation
  const myTasks = tasks.filter(t => t.assigneeIds?.includes(currentUser.id) || t.assigneeId === currentUser.id);
  const completedTasks = myTasks.filter(t => t.status === 'Done').length;
  const activeTasksCount = myTasks.filter(t => t.status !== 'Done' && t.status !== 'Canceled').length;

  // Personal Time Entries
  const myHistory = timeEntries
      .filter(entry => entry.userId === currentUser.id)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // --- Daily Stats Calculation ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysEntries = timeEntries.filter(e => e.userId === currentUser.id && e.date === todayStr);
  
  // Sum finished shifts
  const finishedMinutes = todaysEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  
  // Add active shift duration
  const activeShiftDuration = activeShift ? (currentTime.getTime() - new Date(activeShift.startTime).getTime()) / 60000 : 0;
  const totalTodayMinutes = Math.floor(finishedMinutes + activeShiftDuration);
  const totalTodayLabel = `${Math.floor(totalTodayMinutes / 60)}h ${Math.floor(totalTodayMinutes % 60)}m`;

  // Last Activity Label
  const lastEntry = myHistory[0];
  const lastActivityLabel = lastEntry 
      ? (lastEntry.endTime ? `יציאה ב-${new Date(lastEntry.endTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}` : `כניסה ב-${new Date(lastEntry.startTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}`)
      : '--:--';

  // --- Gamification / Incentives Calculation ---
  // 1. Task Bonus
  const bonusPerTask = currentUser.bonusPerTask || 0;
  const taskBonusTotal = completedTasks * bonusPerTask;

  // 2. Sales Commission
  const commissionPct = currentUser.commissionPct || 0;
  const salesRevenue = leads.filter(l => l.status === LeadStatus.WON).reduce((sum, l) => sum + l.value, 0);
  const commissionTotal = currentUser.role.includes('מכירות') ? (salesRevenue * (commissionPct / 100)) : 0;

  // 3. Accumulated Rewards (Manager Approved)
  const oneOffBonuses = currentUser.accumulatedBonus || 0;

  const currentMonthBonus = taskBonusTotal + commissionTotal + oneOffBonuses;
  const streak = currentUser.streakDays || 0;

  // Update active shift elapsed time
  useEffect(() => {
      const interval = setInterval(() => {
          setCurrentTime(new Date()); // Triggers re-render for total calculations
          
          if (activeShift) {
              const start = new Date(activeShift.startTime).getTime();
              const now = new Date().getTime();
              const diff = now - start;
              
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
              
              setElapsed(
                  `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
              );
          } else {
              setElapsed('00:00:00');
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [activeShift]);

  const handleLogout = () => {
      logout();
      navigate('/login', { replace: true });
  };

  const closeModal = () => setActiveSettingModal(null);

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });

  // Settings Modal Content Generator
  const renderModalContent = () => {
      switch(activeSettingModal) {
          case 'personal': return <PersonalSettings onClose={closeModal} />;
          case 'notifications': return <NotificationSettings onClose={closeModal} />;
          case 'security': return <SecuritySettings />;
          case 'billing': return <BillingSettings />;
          default: return null;
      }
  };

  return (
    <div className="max-w-5xl mx-auto w-full pb-20 px-4 md:px-0">
      
      <AnimatePresence>
          {activeSettingModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={closeModal}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden"
                  >
                      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                          <h3 className="text-xl font-bold text-gray-900">
                              {activeSettingModal === 'personal' && 'עריכת פרופיל'}
                              {activeSettingModal === 'notifications' && 'הגדרות התראות'}
                              {activeSettingModal === 'security' && 'פרטיות ואבטחה'}
                              {activeSettingModal === 'billing' && 'חיוב ומנוי'}
                          </h3>
                          <button onClick={closeModal} className="text-gray-400 hover:text-black p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
                      </div>
                      <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                          {renderModalContent()}
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
          
          {/* Main Profile Card */}
          <div className="bg-white rounded-[2.5rem] border border-gray-200/60 shadow-xl shadow-gray-200/40 relative overflow-visible">
              
              {/* Premium Header Background */}
              <div className="h-56 w-full rounded-t-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/50 to-transparent pointer-events-none"></div>
              </div>
              
              {/* Content Wrapper */}
              <div className="px-8 pb-8">
                  {/* Top Row: Avatar & Actions */}
                  <div className="flex flex-col md:flex-row items-start justify-between relative">
                      
                      {/* Avatar - Negative Margin to Overlap */}
                      <div className="-mt-20 relative z-10">
                          <div className="w-40 h-40 rounded-[2rem] border-[6px] border-white shadow-2xl bg-white p-1 overflow-hidden">
                              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full rounded-[1.7rem] object-cover" />
                          </div>
                      </div>

                      {/* Actions Toolbar - Aligned to bottom of banner visually, then wraps */}
                      <div className="flex gap-3 mt-4 md:mt-4 md:mb-0 w-full md:w-auto justify-end relative z-50">
                          <button 
                            onClick={() => setActiveSettingModal('personal')} 
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                          >
                              ערוך פרופיל
                          </button>
                          <button 
                            onClick={handleLogout} 
                            className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors border border-red-100 shadow-sm flex items-center gap-2 cursor-pointer"
                          >
                              <LogOut size={16} /> התנתק
                          </button>
                      </div>
                  </div>

                  {/* Text Block - Explicitly Below Avatar */}
                  <div className="mt-4 text-right">
                       <div className="flex items-center gap-3 mb-1">
                           <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">{currentUser.name}</h1>
                           {currentUser.role.includes('מנכ') && <Crown size={24} className="text-yellow-500 fill-yellow-500" />}
                       </div>
                       
                       <div className="flex items-center gap-4 text-gray-500 font-medium text-base mb-6 flex-wrap">
                            <span>{currentUser.role}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="flex items-center gap-1 text-gray-400 text-sm"><MapPin size={14} /> {currentUser.location || 'לא צוין מיקום'}</span>
                            {currentUser.phone && (
                                <>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="flex items-center gap-1 text-gray-400 text-sm dir-ltr">{currentUser.phone}</span>
                                </>
                            )}
                       </div>

                       {currentUser.bio && (
                           <p className="text-gray-600 text-sm max-w-2xl mb-6 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 inline-block text-right">
                               {currentUser.bio}
                           </p>
                       )}

                       {/* Tags / Badges */}
                       <div className="flex gap-2 mb-8">
                            <span className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-bold border border-indigo-100 flex items-center gap-1.5">
                                <Crown size={12} className="text-indigo-500 fill-indigo-500" />
                                משתמש פרו
                            </span>
                            <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-lg font-bold border border-emerald-100 flex items-center gap-1.5">
                                <Zap size={12} className="text-emerald-500" />
                                מצטיין צוות
                            </span>
                       </div>
                  </div>

                  {/* Stats Grid - Enhanced */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{completedTasks}</div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">משימות הושלמו</div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 group-hover:text-orange-500 transition-colors">{activeTasksCount}</div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">משימות פעילות</div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">92%</div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">יעילות חודשית</div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default">
                          <div className="text-3xl font-black text-slate-900 text-green-600 flex items-center justify-center gap-2">
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-400"></div>
                              מחובר
                          </div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">סטטוס מערכת</div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Gamification / Performance Wallet Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-[2rem] border border-indigo-700/50 shadow-xl overflow-hidden p-8 text-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex-1 text-center md:text-right">
                      <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2 mb-1">
                          <Wallet className="text-indigo-300" /> הארנק שלי
                      </h3>
                      <p className="text-indigo-200 text-sm opacity-80 mb-6">תגמולים ובונוסים שנצברו החודש</p>
                      
                      <div className="flex items-end justify-center md:justify-start gap-2">
                          <span className="text-5xl font-black tracking-tight">₪{currentMonthBonus.toLocaleString()}</span>
                          <span className="text-indigo-300 font-bold mb-2">בונוס מצטבר</span>
                      </div>
                      
                      <div className="mt-4 flex gap-4 justify-center md:justify-start">
                          <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10">
                              {bonusPerTask > 0 ? `₪${bonusPerTask} / משימה` : 'אין בונוס למשימה'}
                          </div>
                          <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10">
                              {commissionPct > 0 ? `${commissionPct}% עמלת מכירות` : 'אין עמלות מכירה'}
                          </div>
                      </div>
                  </div>

                  <div className="w-px h-24 bg-white/10 hidden md:block"></div>

                  <div className="flex-1 flex flex-col items-center">
                      <div className="relative mb-3">
                          <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-full animate-pulse"></div>
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl flex items-center justify-center shadow-lg border border-orange-300/50 relative z-10 transform rotate-3">
                              <Flame size={32} className="text-white fill-white" />
                          </div>
                      </div>
                      <div className="text-center">
                          <div className="text-3xl font-black">{streak} ימים</div>
                          <div className="text-orange-200 text-xs font-bold uppercase tracking-widest">רצף הצלחות (Streak)</div>
                      </div>
                  </div>

                  <div className="w-px h-24 bg-white/10 hidden md:block"></div>

                  <div className="flex-1 flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3 border border-white/20">
                          <Trophy size={32} className="text-yellow-400" />
                      </div>
                      <div className="text-center">
                          <div className="text-sm font-bold text-indigo-100">היעד הבא</div>
                          <div className="text-xs text-indigo-300 mt-1">בונוס על רצף 7 ימים</div>
                          <div className="w-24 h-1.5 bg-black/30 rounded-full mt-2 overflow-hidden mx-auto">
                              <div className="h-full bg-yellow-400 w-[60%]"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* UNIFIED ATTENDANCE PANEL - Consolidated "One Box" */}
          <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  
                  {/* Left: Info & Timer */}
                  <div className="flex-1 text-center md:text-right w-full">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                          <Clock size={20} className="text-blue-600" />
                          שעון נוכחות
                          {activeShift && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full animate-pulse border border-green-200">פעיל</span>}
                      </h3>
                      
                      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 mb-6">
                          <div className="font-mono text-4xl md:text-5xl font-black text-gray-900 tracking-tight tabular-nums">
                              {elapsed}
                          </div>
                      </div>
                      
                      {/* Integrated Stats Row */}
                      <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 border-t border-gray-100 pt-6 w-full">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-50 rounded-xl text-gray-400"><Timer size={18} /></div>
                              <div className="text-right">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">סה״כ היום</div>
                                  <div className="font-bold text-gray-900 text-sm">{totalTodayLabel}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-50 rounded-xl text-gray-400"><MapPinned size={18} /></div>
                              <div className="text-right">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">מיקום</div>
                                  <div className="font-bold text-gray-900 text-sm">{currentUser.location || 'משרד'}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-50 rounded-xl text-gray-400"><Activity size={18} /></div>
                              <div className="text-right">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">פעילות אחרונה</div>
                                  <div className="font-bold text-gray-900 text-sm">{lastActivityLabel.replace('כניסה ב-', '').replace('יציאה ב-', '')}</div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Hold Button */}
                  <div className="shrink-0 relative">
                       <div className="absolute inset-0 bg-blue-50/50 rounded-full blur-3xl transform scale-150 pointer-events-none"></div>
                       <HoldButton 
                          isActive={!!activeShift} 
                          onComplete={activeShift ? clockOut : clockIn} 
                          label={activeShift ? 'יציאה' : 'כניסה'} 
                          size="normal"
                      />
                  </div>
              </div>

              {/* Collapsible History Drawer */}
              <div className="border-t border-gray-100 bg-gray-50/30">
                  <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full p-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors uppercase tracking-wide"
                  >
                      {showHistory ? 'הסתר היסטוריה' : 'הצג היסטוריית נוכחות'}
                      <ChevronDown size={14} className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                      {showHistory && (
                          <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                          >
                              <div className="p-4 overflow-x-auto">
                                  <table className="w-full text-sm text-right">
                                      <thead className="text-gray-400 font-bold text-[10px] uppercase tracking-wider border-b border-gray-200/50">
                                          <tr>
                                              <th className="px-4 py-2">תאריך</th>
                                              <th className="px-4 py-2">כניסה</th>
                                              <th className="px-4 py-2">יציאה</th>
                                              <th className="px-4 py-2">סה״כ</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {myHistory.slice(0, 5).map(entry => (
                                              <tr key={entry.id} className="text-gray-600 hover:bg-white transition-colors">
                                                  <td className="px-4 py-3 font-bold text-gray-900">{formatDate(entry.startTime)}</td>
                                                  <td className="px-4 py-3 font-mono text-xs">{formatTime(entry.startTime)}</td>
                                                  <td className="px-4 py-3 font-mono text-xs">{entry.endTime ? formatTime(entry.endTime) : '-'}</td>
                                                  <td className="px-4 py-3 font-bold">{entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}:${(entry.durationMinutes % 60).toString().padStart(2, '0')}` : '-'}</td>
                                              </tr>
                                          ))}
                                          {myHistory.length === 0 && (
                                              <tr><td colSpan={4} className="p-6 text-center text-gray-400 text-xs">אין נתונים להצגה</td></tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveSettingModal('personal')}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-right group relative overflow-hidden"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300"></div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <UserIcon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">פרטים אישיים</h3>
                  <p className="text-sm text-gray-500 mt-1">ערוך את פרטי הפרופיל, תמונה ופרטי קשר.</p>
              </button>

              <button 
                onClick={() => setActiveSettingModal('notifications')}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-right group relative overflow-hidden"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-purple-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300"></div>
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <Bell size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">התראות ועדכונים</h3>
                  <p className="text-sm text-gray-500 mt-1">נהל את אופן קבלת ההודעות מהמערכת.</p>
              </button>

              <button 
                onClick={() => setActiveSettingModal('security')}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-right group relative overflow-hidden"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-orange-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300"></div>
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <Shield size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">אבטחה ופרטיות</h3>
                  <p className="text-sm text-gray-500 mt-1">שינוי סיסמה, אימות דו-שלבי וניהול גישות.</p>
              </button>

              <button 
                onClick={() => setActiveSettingModal('billing')}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-right group relative overflow-hidden"
              >
                  <div className="absolute top-0 right-0 w-1 h-full bg-green-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300"></div>
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <CreditCard size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">חיוב ומנויים</h3>
                  <p className="text-sm text-gray-500 mt-1">צפה בחשבוניות, שדרג חבילה ועדכן אמצעי תשלום.</p>
              </button>
          </div>

          <div className="text-center text-xs text-gray-400 mt-4">
              Nexus OS v2.5.0 • <span className="underline cursor-pointer hover:text-gray-600">תנאי שימוש</span> • <span className="underline cursor-pointer hover:text-gray-600">מדיניות פרטיות</span>
          </div>

      </div>
    </div>
  );
};

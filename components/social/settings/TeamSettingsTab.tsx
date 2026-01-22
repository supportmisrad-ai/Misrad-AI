'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Shield, Users, Trash2, X, Edit2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TeamMember } from '@/types/social';
import { useApp } from '@/contexts/AppContext';
import { translateError } from '@/lib/errorTranslations';
import { getTeamRoleDisplayName } from '@/lib/roleTranslations';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { Avatar } from '@/components/Avatar';

interface TeamSettingsTabProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  team: TeamMember[];
}

const CustomToggle = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={`relative w-14 h-7 rounded-full transition-all duration-500 focus:outline-none shadow-inner flex items-center px-1 overflow-hidden shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
  >
    <motion.div
      animate={{ x: enabled ? 28 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="w-5 h-5 bg-white rounded-full shadow-md z-10"
    />
  </button>
);

export default function TeamSettingsTab({ onNotify, isEnabled, setIsEnabled, team }: TeamSettingsTabProps) {
  const { setTeam } = useApp();
  const pathname = usePathname();
  const orgSlug = useMemo(() => parseWorkspaceRoute(pathname).orgSlug, [pathname]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('account_manager');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail) {
      onNotify('נא להזין כתובת אימייל', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const { inviteTeamMember } = await import('@/app/actions/auth');
      const result = await inviteTeamMember(inviteEmail, inviteRole, orgSlug || undefined);
      
      if (result.success) {
        onNotify(`הזמנה נשלחה לכתובת ${inviteEmail}`, 'success');
        setInviteEmail('');
        setInviteRole('account_manager');
        setIsInviteOpen(false);
      } else {
        const errorMsg = result.error ? translateError(result.error) : 'שגיאה בשליחת הזמנה';
        onNotify(errorMsg, 'error');
      }
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      const errorMsg = error.message ? translateError(error.message) : 'שגיאה בשליחת הזמנה';
      onNotify('שגיאה בשליחת הזמנה: ' + errorMsg, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditingMember({
      name: member.name,
      role: member.role,
      memberType: member.memberType,
      monthlySalary: member.monthlySalary,
      hourlyRate: member.hourlyRate,
    });
  };

  const handleSaveEdit = () => {
    if (!editingMemberId || !editingMember) return;
    
    setTeam(prev => prev.map(m => 
      m.id === editingMemberId 
        ? { ...m, ...editingMember }
        : m
    ));
    
    onNotify('פרטי חבר הצוות עודכנו בהצלחה');
    setEditingMemberId(null);
    setEditingMember(null);
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditingMember(null);
  };

  const handleDelete = (memberId: string) => {
    setDeletingMemberId(memberId);
  };

  const confirmDelete = () => {
    if (!deletingMemberId) return;
    
    setTeam(prev => prev.filter(m => m.id !== deletingMemberId));
    onNotify('חבר הצוות הוסר בהצלחה');
    setDeletingMemberId(null);
  };

  const cancelDelete = () => {
    setDeletingMemberId(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800">ניהול הרשאות וצוות</h2>
      </div>

      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Users size={24} className="text-blue-600"/> מודול ניהול צוות
            </h3>
            <p className="text-sm font-bold text-slate-400 max-w-md">הפעל מודול זה כדי לנהל עובדים, להקצות לקוחות ולצפות בעומסי עבודה של הסוכנות.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-black uppercase ${isEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
              {isEnabled ? 'פעיל' : 'כבוי'}
            </span>
            <CustomToggle enabled={isEnabled} onToggle={() => setIsEnabled(!isEnabled)} />
          </div>
        </div>

        {isEnabled && (
          <div className="mt-8 flex flex-col gap-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center px-4">
              <h4 className="text-lg font-black">חברי צוות פעילים</h4>
              <button onClick={() => setIsInviteOpen(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg">
                <UserPlus size={16}/> הוסף חבר צוות
              </button>
            </div>

            {isInviteOpen && (
              <div className="bg-blue-50/50 p-6 rounded-[32px] border-2 border-dashed border-blue-200 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase mr-2">כתובת אימייל</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@agency.com"
                    className="bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
                  />
                </div>
                <div className="w-full md:w-48 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mr-2">תפקיד</label>
                  <select 
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:ring-2 ring-blue-200"
                  >
                    <option value="account_manager">מנהל לקוח</option>
                    <option value="designer">מעצב גרפי</option>
                    <option value="content_creator">קופירייטר</option>
                    <option value="social_manager">מנהל סושיאל מדיה</option>
                  </select>
                </div>
                <button 
                  onClick={handleInvite} 
                  disabled={isInviting}
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-lg h-[46px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isInviting ? 'שולח...' : 'שלח הזמנה'}
                </button>
                <button onClick={() => setIsInviteOpen(false)} className="p-3 text-slate-400"><X size={20}/></button>
              </div>
            )}

            {team.length === 0 ? (
              <div className="bg-slate-50/50 p-12 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                <Users size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-black text-slate-400 mb-2">אין חברי צוות במערכת</p>
                <p className="text-sm font-bold text-slate-300">הוסף חבר צוות ראשון כדי להתחיל</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {team.map(member => {
                  const isEditing = editingMemberId === member.id;
                  const memberData = isEditing && editingMember ? { ...member, ...editingMember } : member;
                  
                  return (
                    <div key={member.id} className="p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 flex flex-col gap-4 group hover:bg-white hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar
                            src={String(member.avatar || '')}
                            name={String(member.name || '')}
                            alt={String(member.name || '')}
                            size="lg"
                            rounded="2xl"
                            className="shadow-sm"
                          />
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={memberData.name}
                                  onChange={e => setEditingMember({ ...editingMember!, name: e.target.value })}
                                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-black text-sm outline-none focus:ring-2 ring-blue-200"
                                />
                                <select
                                  value={memberData.role}
                                  onChange={e => setEditingMember({ ...editingMember!, role: e.target.value as any })}
                                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-2 ring-blue-200"
                                >
                                  <option value="account_manager">מנהל לקוח</option>
                                  <option value="designer">מעצב גרפי</option>
                                  <option value="content_creator">קופירייטר</option>
                                  <option value="social_manager">מנהל סושיאל מדיה</option>
                                </select>
                                <select
                                  value={memberData.memberType}
                                  onChange={e => setEditingMember({ ...editingMember!, memberType: e.target.value as 'employee' | 'freelancer' })}
                                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-2 ring-blue-200"
                                >
                                  <option value="employee">עובד</option>
                                  <option value="freelancer">פרילנסר</option>
                                </select>
                                {memberData.memberType === 'employee' ? (
                                  <input
                                    type="number"
                                    value={memberData.monthlySalary || ''}
                                    onChange={e => setEditingMember({ ...editingMember!, monthlySalary: parseInt(e.target.value) || undefined })}
                                    placeholder="שכר חודשי"
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-2 ring-blue-200"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    value={memberData.hourlyRate || ''}
                                    onChange={e => setEditingMember({ ...editingMember!, hourlyRate: parseInt(e.target.value) || undefined })}
                                    placeholder="שכר שעתי"
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-2 ring-blue-200"
                                  />
                                )}
                              </div>
                            ) : (
                              <div>
                                <p className="font-black text-slate-800">{member.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                  {getTeamRoleDisplayName(member.role)}
                                </p>
                                <p className="text-[9px] font-bold text-blue-600 mt-1">
                                  {member.memberType === 'employee' ? 'עובד' : 'פרילנסר'}
                                  {member.monthlySalary && ` • ₪${member.monthlySalary.toLocaleString()}/חודש`}
                                  {member.hourlyRate && ` • ₪${member.hourlyRate}/שעה`}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-10">
                          <div className="hidden md:flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-300 uppercase">לקוחות</span>
                            <span className="font-black">{member.assignedClients.length}</span>
                          </div>
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button 
                                  onClick={handleSaveEdit}
                                  className="p-3 bg-green-500 text-white rounded-xl shadow-sm hover:bg-green-600 transition-all"
                                  title="שמור שינויים"
                                >
                                  <Save size={18}/>
                                </button>
                                <button 
                                  onClick={handleCancelEdit}
                                  className="p-3 bg-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-300 transition-all"
                                  title="בטל"
                                >
                                  <X size={18}/>
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleEdit(member)}
                                  className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all"
                                  title="ערוך"
                                >
                                  <Edit2 size={18}/>
                                </button>
                                <button 
                                  onClick={() => handleDelete(member.id)}
                                  className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 shadow-sm transition-all"
                                  title="מחק"
                                >
                                  <Trash2 size={18}/>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <AnimatePresence>
              {deletingMemberId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
                  onClick={cancelDelete}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
                    dir="rtl"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="text-red-600" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">הסרת חבר צוות</h3>
                        <p className="text-sm font-bold text-slate-400">האם אתה בטוח שברצונך להסיר את חבר הצוות?</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-6">
                      פעולה זו תסיר את חבר הצוות מהמערכת ולא ניתן לבטל אותה.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={cancelDelete}
                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
                      >
                        ביטול
                      </button>
                      <button
                        onClick={confirmDelete}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 transition-all flex items-center gap-2"
                      >
                        <Trash2 size={16} /> הסר חבר צוות
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-black flex items-center gap-3"><Shield size={24} className="text-blue-400"/> אבטחה והרשאות (Roles)</h3>
          <p className="text-sm font-bold text-slate-400 leading-relaxed mt-4">
            ב-Social ניתן להגביל גישה לפי תפקיד. למשל, מעצב גרפי יוכל להעלות חומרים לבנק התכנים אך לא יוכל לשנות את פרטי התשלום של הלקוח.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="font-black text-blue-400 text-xs">Admin</p>
              <p className="text-[10px] text-slate-500 mt-1">גישה מלאה לכל המערכת, תשלומים וצוות.</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="font-black text-green-400 text-xs">Account Manager</p>
              <p className="text-[10px] text-slate-500 mt-1">ניהול לקוחות, אישור פוסטים ושיחות צ׳אט.</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="font-black text-orange-400 text-xs">Creator</p>
              <p className="text-[10px] text-slate-500 mt-1">יצירת פוסטים, העלאת מדיה וגישה לבנק רעיונות.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


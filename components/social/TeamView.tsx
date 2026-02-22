'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, X, CircleCheckBig, Trash2, Settings, Wallet, UserPlus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { Avatar } from '@/components/Avatar';
import { getTeamRoleDisplayName } from '@/lib/roleTranslations';
import { getSocialBasePath } from '@/lib/os/social-routing';
import { canManageTeamMembers } from '@/lib/rbac';
import { translateError } from '@/lib/errorTranslations';
import { CustomSelect } from '@/components/CustomSelect';

export default function TeamView() {
  const router = useRouter();
  const pathname = usePathname();
  const { team, clients, setSettingsSubView, userRole, addToast } = useApp();
  const [selectedMember, setSelectedMember] = useState<typeof team[0] | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('account_manager');
  const [isInviting, setIsInviting] = useState(false);

  const basePath = getSocialBasePath(pathname);
  const orgSlug = basePath.startsWith('/w/') ? basePath.split('/')[2] : null;

  const handleInvite = async () => {
    if (!inviteEmail) {
      addToast('נא להזין כתובת אימייל', 'error');
      return;
    }
    setIsInviting(true);
    try {
      const { inviteTeamMember } = await import('@/app/actions/auth');
      const result = await inviteTeamMember(inviteEmail, inviteRole, orgSlug || undefined);
      if (result.success) {
        addToast(`הזמנה נשלחה לכתובת ${inviteEmail}`, 'success');
        setInviteEmail('');
        setInviteRole('account_manager');
        setIsInviteOpen(false);
      } else {
        const errorMsg = result.error ? translateError(result.error) : 'שגיאה בשליחת הזמנה';
        addToast(errorMsg, 'error');
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error && error.message ? translateError(error.message) : 'שגיאה בשליחת הזמנה';
      addToast(errorMsg, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-10 pb-20 animate-in fade-in" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">ניהול צוות וביצועים</h2>
          <p className="text-slate-400 font-bold">צפה בעומסים, הקצה משימות ונהל את ה-Workflow של הסוכנות.</p>
        </div>
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-black">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div> {team.filter(m => m.capacityScore < 90).length} זמינים
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div> {team.filter(m => m.memberType === 'freelancer').length} פרילנסרים
          </div>
        </div>
      </div>

      {canManageTeamMembers(userRole) && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all"
          >
            <UserPlus size={16} /> הוסף חבר צוות
          </button>
        </div>
      )}

      {isInviteOpen && (
        <div className="bg-blue-50/50 p-6 rounded-[32px] border-2 border-dashed border-blue-200 flex flex-col md:flex-row gap-4 items-end animate-in fade-in">
          <div className="flex-1 flex flex-col gap-2 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase mr-2">כתובת אימייל</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder='דוא"ל'
              className="bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm w-full outline-none focus:ring-2 ring-blue-200"
            />
          </div>
          <div className="w-full md:w-48 flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase mr-2">תפקיד</label>
            <CustomSelect
              value={inviteRole}
              onChange={(val) => setInviteRole(val)}
              options={[
                { value: 'account_manager', label: 'מנהל לקוח' },
                { value: 'designer', label: 'מעצב גרפי' },
                { value: 'content_creator', label: 'קופירייטר' },
                { value: 'social_manager', label: 'מנהל סושיאל מדיה' },
              ]}
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={isInviting}
            className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-lg h-[46px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isInviting ? 'שולח...' : 'שלח הזמנה'}
          </button>
          <button onClick={() => setIsInviteOpen(false)} className="p-3 text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
      )}

      {team.length === 0 ? (
        <div className="bg-white p-20 rounded-[48px] border border-slate-200 shadow-xl text-center flex flex-col items-center gap-6">
          <Users size={64} className="text-slate-200" />
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-black text-slate-800 mb-2">אין חברי צוות במערכת</p>
            <p className="text-sm font-bold text-slate-400 mb-6">התחל בהוספת חבר צוות ראשון כדי לנהל את הצוות שלך</p>
          </div>
          <button 
            onClick={() => {
              if (!canManageTeamMembers(userRole)) return;
              setIsInviteOpen(true);
            }}
            className={`bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2 ${
              canManageTeamMembers(userRole) ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <UserPlus size={20} /> הוסף חבר צוות ראשון
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {team.map((member) => {
          const isOverloaded = member.capacityScore > 90;
          const isFreelancer = member.memberType === 'freelancer';
          
          return (
            <motion.div
              key={member.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedMember(member)}
              className="bg-white p-8 rounded-[48px] border-2 border-slate-50 shadow-xl flex flex-col gap-8 group relative overflow-hidden cursor-pointer hover:border-blue-500 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="relative">
                  <Avatar
                    src={String(member.avatar || '')}
                    name={String(member.name || '')}
                    alt={String(member.name || '')}
                    size="xl"
                    rounded="3xl"
                    className="w-20 h-20 shadow-lg border-4 border-white"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${isOverloaded ? 'bg-red-500' : 'bg-green-500'}`}></div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${isFreelancer ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-900 text-white'}`}>
                    {isFreelancer ? 'Freelancer' : 'Staff'}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase mt-1">קיבולת</span>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-800">{member.name}</h3>
                <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mt-1">
                  {getTeamRoleDisplayName(member.role)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">לקוחות</p>
                  <p className="text-xl font-black">{member.assignedClients.length}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">משימות</p>
                  <p className="text-xl font-black">{member.activeTasksCount}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">עומס עבודה</span>
                  <span className={`text-[10px] font-black uppercase ${isOverloaded ? 'text-red-600' : 'text-green-600'}`}>
                    {member.capacityScore}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${member.capacityScore}%` }}
                    className={`h-full rounded-full ${isOverloaded ? 'bg-red-500' : 'bg-blue-600'}`}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase">ניהול תיק לקוחות:</p>
                  <button className="text-[9px] font-black text-blue-600 hover:underline">ערוך שיוך</button>
                </div>
                <div className="flex -space-x-2 space-x-reverse">
                  {member.assignedClients.map(cid => {
                    const client = clients.find(c => c.id === cid);
                    return (
                      <Avatar
                        key={cid}
                        src={String(client?.avatar || '')}
                        name={String(client?.companyName || client?.name || '')}
                        alt={String(client?.companyName || '')}
                        size="lg"
                        rounded="xl"
                        className="border-2 border-white shadow-sm"
                      />
                    );
                  })}
                  <button className="w-10 h-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-300 flex items-center justify-center hover:border-blue-400 hover:text-blue-500 transition-all">+</button>
                </div>
              </div>
            </motion.div>
          );
        })}
        </div>
      )}

      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedMember(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white w-full max-w-4xl rounded-[56px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              dir="rtl"
            >
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-6">
                  <Avatar
                    src={String(selectedMember.avatar || '')}
                    name={String(selectedMember.name || '')}
                    alt={String(selectedMember.name || '')}
                    size="xl"
                    rounded="3xl"
                    className="w-20 h-20 shadow-xl border-4 border-white"
                  />
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black">{selectedMember.name}</h2>
                      <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase">{selectedMember.memberType}</span>
                    </div>
                    <p className="text-blue-600 font-bold uppercase tracking-widest">{getTeamRoleDisplayName(selectedMember.role)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className="p-3 hover:bg-white rounded-2xl shadow-sm"><X size={28}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 flex flex-col gap-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-slate-900 text-white p-8 rounded-[40px] flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black text-white/40 uppercase">קיבולת נוכחית</p>
                    <p className="text-5xl font-black">{selectedMember.capacityScore}%</p>
                  </div>
                  <div className="bg-blue-50 p-8 rounded-[40px] flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black text-blue-400 uppercase">משימות פתוחות</p>
                    <p className="text-5xl font-black text-blue-900">{selectedMember.activeTasksCount}</p>
                  </div>
                  <div className="bg-green-50 p-8 rounded-[40px] flex flex-col items-center gap-2 relative overflow-hidden group">
                    <p className="text-[10px] font-black text-green-500 uppercase">עלות {selectedMember.memberType === 'employee' ? 'שכר' : 'פרילנס'}</p>
                    <p className="text-3xl font-black text-green-900">
                      {selectedMember.memberType === 'employee' ? `₪${selectedMember.monthlySalary?.toLocaleString()}` : `₪${selectedMember.hourlyRate}/hr`}
                    </p>
                    <Wallet className="absolute -bottom-2 -right-2 text-green-600/10 group-hover:scale-125 transition-transform" size={80}/>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black flex items-center gap-3"><Briefcase size={22}/> לקוחות בטיפול</h3>
                    <button onClick={() => setIsAssigning(!isAssigning)} className="px-6 py-2 bg-slate-100 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">ערוך שיוך לקוחות</button>
                  </div>
                  
                  {isAssigning && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-50/50 p-8 rounded-[40px] border-2 border-dashed border-blue-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {clients.map(c => {
                        const isAssigned = selectedMember.assignedClients.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${isAssigned ? 'bg-white border-blue-500 shadow-md' : 'bg-white/50 border-transparent opacity-60'}`}
                          >
                            <Avatar
                              src={String(c.avatar || '')}
                              name={String(c.companyName || c.name || '')}
                              alt={String(c.companyName || '')}
                              size="md"
                              rounded="lg"
                            />
                            <span className="font-bold text-xs truncate">{c.companyName}</span>
                            {isAssigned && <CircleCheckBig size={14} className="text-blue-500 ml-auto"/>}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-4">
                    {selectedMember.assignedClients.map(cid => {
                      const client = clients.find(c => c.id === cid);
                      return (
                        <div key={cid} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                          <div className="flex items-center gap-6">
                            <Avatar
                              src={String(client?.avatar || '')}
                              name={String(client?.companyName || client?.name || '')}
                              alt={String(client?.companyName || '')}
                              size="lg"
                              rounded="2xl"
                              className="shadow-md"
                            />
                            <div>
                              <p className="font-black text-lg text-slate-800">{client?.companyName}</p>
                              <p className="text-xs font-bold text-slate-400">סטטוס: {client?.status === 'Active' ? 'פעיל' : 'ממתין'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-[10px] font-black text-slate-300 uppercase">תפוקה החודש</p>
                              <p className="font-black">12 פוסטים</p>
                            </div>
                            <button className="p-3 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-900 border-t flex items-center justify-between">
                <button
                  onClick={() => {
                    if (!canManageTeamMembers(userRole)) return;
                    if (orgSlug) {
                      setSettingsSubView('team_management');
                      router.push(`/w/${encodeURIComponent(orgSlug)}/social/settings`);
                      return;
                    }
                    router.push('/');
                  }}
                  className={`flex items-center gap-2 font-black text-sm transition-all ${
                    canManageTeamMembers(userRole)
                      ? 'text-white/60 hover:text-white'
                      : 'text-white/30 cursor-not-allowed'
                  }`}
                >
                  <Settings size={18}/> הגדרות חשבון וחיובים
                </button>
                <button onClick={() => setSelectedMember(null)} className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black shadow-xl">סגור תצוגה</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


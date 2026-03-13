'use client';

import React, { useState, useCallback, useTransition, useMemo } from 'react';
import { Select } from '@/components/ui/select';
import {
  Users, Plus, Trash2, UserPlus, Target, ChevronDown, ChevronUp,
  Phone, Mail, Crown, Crosshair, Shield, Zap, X
} from 'lucide-react';
import type { SalesTeamDTO } from '@/app/actions/system-sales-teams';

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  LEADER: { label: 'מנהל צוות', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Crown size={12} /> },
  CLOSER: { label: 'סוגר', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: <Crosshair size={12} /> },
  SDR: { label: 'SDR', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <Zap size={12} /> },
  MEMBER: { label: 'חבר צוות', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: <Shield size={12} /> },
};

interface TeamsViewProps {
  initialTeams: SalesTeamDTO[];
  orgSlug: string;
  createTeamAction: (orgSlug: string, data: { name: string; description?: string; color?: string; target_monthly?: number }) => Promise<{ id?: string; error?: string }>;
  addMemberAction: (orgSlug: string, data: { team_id: string; name: string; email?: string; phone?: string; role?: string }) => Promise<{ id?: string; error?: string }>;
  deleteTeamAction: (orgSlug: string, teamId: string) => Promise<{ error?: string }>;
  deleteMemberAction: (orgSlug: string, memberId: string) => Promise<{ error?: string }>;
}

const TeamsView: React.FC<TeamsViewProps> = ({
  initialTeams,
  orgSlug,
  createTeamAction,
  addMemberAction,
  deleteTeamAction,
  deleteMemberAction,
}) => {
  const [teams, setTeams] = useState<SalesTeamDTO[]>(initialTeams);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create team form state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamTarget, setNewTeamTarget] = useState('');

  // Add member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim()) return;
    startTransition(async () => {
      const result = await createTeamAction(orgSlug, {
        name: newTeamName.trim(),
        description: newTeamDesc.trim() || undefined,
        target_monthly: parseInt(newTeamTarget) || 0,
      });
      if (result.id) {
        setTeams((prev) => [{
          id: result.id!,
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || null,
          color: '#6366f1',
          target_monthly: parseInt(newTeamTarget) || 0,
          is_active: true,
          created_at: new Date().toISOString(),
          members: [],
        }, ...prev]);
        setNewTeamName('');
        setNewTeamDesc('');
        setNewTeamTarget('');
        setShowCreateTeam(false);
      }
    });
  }, [newTeamName, newTeamDesc, newTeamTarget, orgSlug, createTeamAction]);

  const handleAddMember = useCallback(async (teamId: string) => {
    if (!newMemberName.trim()) return;
    startTransition(async () => {
      const result = await addMemberAction(orgSlug, {
        team_id: teamId,
        name: newMemberName.trim(),
        email: newMemberEmail.trim() || undefined,
        phone: newMemberPhone.trim() || undefined,
        role: newMemberRole,
      });
      if (result.id) {
        setTeams((prev) => prev.map((t) => t.id === teamId ? {
          ...t,
          members: [...t.members, {
            id: result.id!,
            team_id: teamId,
            name: newMemberName.trim(),
            email: newMemberEmail.trim() || null,
            phone: newMemberPhone.trim() || null,
            avatar: null,
            role: newMemberRole,
            target_monthly: 0,
            is_active: true,
          }],
        } : t));
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPhone('');
        setNewMemberRole('MEMBER');
        setShowAddMember(null);
      }
    });
  }, [newMemberName, newMemberEmail, newMemberPhone, newMemberRole, orgSlug, addMemberAction]);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    startTransition(async () => {
      const result = await deleteTeamAction(orgSlug, teamId);
      if (!result.error) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
      }
    });
  }, [orgSlug, deleteTeamAction]);

  const handleDeleteMember = useCallback(async (teamId: string, memberId: string) => {
    startTransition(async () => {
      const result = await deleteMemberAction(orgSlug, memberId);
      if (!result.error) {
        setTeams((prev) => prev.map((t) => t.id === teamId ? {
          ...t,
          members: t.members.filter((m) => m.id !== memberId),
        } : t));
      }
    });
  }, [orgSlug, deleteMemberAction]);

  const totalMembers = teams.reduce((s, t) => s + t.members.length, 0);

  return (
    <div className="flex-1 flex flex-col max-w-[1920px] mx-auto animate-fade-in pb-24 min-h-0">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="text-indigo-500" strokeWidth={2.5} size={28} />
            צוותי מכירות
          </h2>
          <p className="text-sm text-slate-500 mt-1">{teams.length} צוותים • {totalMembers} חברי צוות</p>
        </div>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
          type="button"
        >
          <Plus size={16} />
          צוות חדש
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
          <p className="text-2xl font-black text-indigo-600">{teams.length}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">צוותים פעילים</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <p className="text-2xl font-black text-emerald-600">{totalMembers}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">חברי צוות</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-2xl font-black text-amber-600">{teams.filter(t => t.members.some(m => m.role === 'LEADER')).length}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">מנהלי צוות</p>
        </div>
        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
          <p className="text-2xl font-black text-rose-600">₪{teams.reduce((s, t) => s + t.target_monthly, 0).toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">יעד חודשי כולל</p>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowCreateTeam(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">צוות חדש</h3>
              <button onClick={() => setShowCreateTeam(false)} type="button" className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input
                type="text" placeholder="שם הצוות *" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="text" placeholder="תיאור (אופציונלי)" value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="number" placeholder="יעד חודשי ₪" value={newTeamTarget} onChange={(e) => setNewTeamTarget(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleCreateTeam}
                disabled={!newTeamName.trim() || isPending}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                type="button"
              >
                {isPending ? 'יוצר...' : 'צור צוות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
            <Users size={36} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">אין צוותים עדיין</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6">צור את הצוות הראשון שלך כדי להתחיל לנהל את אנשי המכירות</p>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
            type="button"
          >
            <Plus size={16} />
            צור צוות ראשון
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const isExpanded = expandedTeam === team.id;
            const leader = team.members.find((m) => m.role === 'LEADER');
            return (
              <div key={team.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Team Header */}
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  type="button"
                  className="w-full flex items-center gap-4 p-5 text-right hover:bg-slate-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0" style={{ backgroundColor: team.color }}>
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-slate-800">{team.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold mt-0.5">צוותים פעילים</span>
                    </div>
                    {team.description && <p className="text-xs text-slate-400 truncate">{team.description}</p>}
                    {leader && <p className="text-[10px] text-indigo-500 font-bold mt-0.5">מנהל: {leader.name}</p>}
                  </div>
                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Target size={12} />
                        <span>₪{team.target_monthly.toLocaleString()}</span>
                      </div>
                      <p className="text-[9px] text-slate-500">יעד חודשי</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 space-y-4 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-700">חברי צוות ({team.members.length})</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddMember(team.id)}
                          type="button"
                          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                        >
                          <UserPlus size={14} /> הוסף חבר
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          type="button"
                          className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} /> מחק צוות
                        </button>
                      </div>
                    </div>

                    {/* Add Member Form */}
                    {showAddMember === team.id && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input type="text" placeholder="שם *" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <input type="email" placeholder="אימייל" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <input type="tel" placeholder="טלפון" value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="h-10 text-sm">
                            <option value="MEMBER">חבר צוות</option>
                            <option value="LEADER">מנהל צוות</option>
                            <option value="CLOSER">סוגר</option>
                            <option value="SDR">SDR</option>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAddMember(team.id)} disabled={!newMemberName.trim() || isPending} type="button" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                            {isPending ? 'מוסיף...' : 'הוסף'}
                          </button>
                          <button onClick={() => setShowAddMember(null)} type="button" className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300">ביטול</button>
                        </div>
                      </div>
                    )}

                    {/* Members List */}
                    {team.members.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        <UserPlus size={24} className="mx-auto mb-2 text-slate-300" />
                        אין חברי צוות עדיין
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {team.members.map((member) => {
                          const roleConfig = ROLE_LABELS[member.role] || ROLE_LABELS.MEMBER;
                          return (
                            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-700 shrink-0">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  member.name.charAt(0)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-800">{member.name}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${roleConfig.color}`}>
                                    {roleConfig.icon} {roleConfig.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {member.email && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Mail size={10} />{member.email}</span>}
                                  {member.phone && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone size={10} />{member.phone}</span>}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteMember(team.id, member.id)}
                                type="button"
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamsView;

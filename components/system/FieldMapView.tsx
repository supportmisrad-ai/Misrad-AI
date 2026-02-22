'use client';

import React, { useState, useCallback, useTransition } from 'react';
import {
  MapPin, Plus, Trash2, UserPlus, ChevronDown, ChevronUp,
  Phone, Navigation, CheckCircle2, Coffee, Circle, X, Users
} from 'lucide-react';
import type { FieldTeamDTO } from '@/app/actions/system-field-teams';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  AVAILABLE: { label: 'זמין', color: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-400', icon: <CheckCircle2 size={12} /> },
  EN_ROUTE: { label: 'בדרך', color: 'text-blue-700 bg-blue-50', dot: 'bg-blue-400', icon: <Navigation size={12} /> },
  ON_SITE: { label: 'אצל לקוח', color: 'text-amber-700 bg-amber-50', dot: 'bg-amber-400', icon: <MapPin size={12} /> },
  BREAK: { label: 'הפסקה', color: 'text-slate-600 bg-slate-100', dot: 'bg-slate-400', icon: <Coffee size={12} /> },
  OFFLINE: { label: 'לא מחובר', color: 'text-slate-400 bg-slate-50', dot: 'bg-slate-300', icon: <Circle size={12} /> },
};

interface FieldMapViewProps {
  initialTeams: FieldTeamDTO[];
  orgSlug: string;
  createTeamAction: (orgSlug: string, data: { name: string; area?: string; color?: string }) => Promise<{ id?: string; error?: string }>;
  addAgentAction: (orgSlug: string, data: { team_id: string; name: string; phone?: string; area?: string }) => Promise<{ id?: string; error?: string }>;
  deleteTeamAction: (orgSlug: string, teamId: string) => Promise<{ error?: string }>;
  deleteAgentAction: (orgSlug: string, agentId: string) => Promise<{ error?: string }>;
}

const FieldMapView: React.FC<FieldMapViewProps> = ({
  initialTeams, orgSlug, createTeamAction, addAgentAction, deleteTeamAction, deleteAgentAction,
}) => {
  const [teams, setTeams] = useState<FieldTeamDTO[]>(initialTeams);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamArea, setNewTeamArea] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentArea, setNewAgentArea] = useState('');

  const totalAgents = teams.reduce((s, t) => s + t.agents.length, 0);
  const activeAgents = teams.reduce((s, t) => s + t.agents.filter(a => a.status !== 'OFFLINE').length, 0);

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim()) return;
    startTransition(async () => {
      const result = await createTeamAction(orgSlug, {
        name: newTeamName.trim(),
        area: newTeamArea.trim() || undefined,
      });
      if (result.id) {
        setTeams((prev) => [{ id: result.id!, name: newTeamName.trim(), area: newTeamArea.trim() || null, color: '#f43f5e', is_active: true, created_at: new Date().toISOString(), agents: [] }, ...prev]);
        setNewTeamName(''); setNewTeamArea(''); setShowCreateTeam(false);
      }
    });
  }, [newTeamName, newTeamArea, orgSlug, createTeamAction]);

  const handleAddAgent = useCallback(async (teamId: string) => {
    if (!newAgentName.trim()) return;
    startTransition(async () => {
      const result = await addAgentAction(orgSlug, { team_id: teamId, name: newAgentName.trim(), phone: newAgentPhone.trim() || undefined, area: newAgentArea.trim() || undefined });
      if (result.id) {
        setTeams((prev) => prev.map((t) => t.id === teamId ? { ...t, agents: [...t.agents, { id: result.id!, team_id: teamId, name: newAgentName.trim(), phone: newAgentPhone.trim() || null, avatar: null, area: newAgentArea.trim() || null, status: 'AVAILABLE', lat: null, lng: null, is_active: true, visits_today: 0, visits_remaining: 0 }] } : t));
        setNewAgentName(''); setNewAgentPhone(''); setNewAgentArea(''); setShowAddAgent(null);
      }
    });
  }, [newAgentName, newAgentPhone, newAgentArea, orgSlug, addAgentAction]);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    startTransition(async () => {
      const result = await deleteTeamAction(orgSlug, teamId);
      if (!result.error) setTeams((prev) => prev.filter((t) => t.id !== teamId));
    });
  }, [orgSlug, deleteTeamAction]);

  const handleDeleteAgent = useCallback(async (teamId: string, agentId: string) => {
    startTransition(async () => {
      const result = await deleteAgentAction(orgSlug, agentId);
      if (!result.error) setTeams((prev) => prev.map((t) => t.id === teamId ? { ...t, agents: t.agents.filter(a => a.id !== agentId) } : t));
    });
  }, [orgSlug, deleteAgentAction]);

  return (
    <div className="flex-1 flex flex-col max-w-[1920px] mx-auto animate-fade-in pb-24 min-h-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <MapPin className="text-rose-500" strokeWidth={2.5} size={28} />
            צוותי שטח
          </h2>
          <p className="text-sm text-slate-500 mt-1">{teams.length} צוותים • {totalAgents} אנשי שטח • {activeAgents} פעילים</p>
        </div>
        <button onClick={() => setShowCreateTeam(true)} className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-2" type="button">
          <Plus size={16} /> צוות חדש
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
          <p className="text-2xl font-black text-rose-600">{teams.length}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">צוותים</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <p className="text-2xl font-black text-emerald-600">{activeAgents}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">פעילים עכשיו</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-2xl font-black text-blue-600">{teams.reduce((s, t) => s + t.agents.reduce((sa, a) => sa + a.visits_today, 0), 0)}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">ביקורים שבוצעו היום</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-2xl font-black text-amber-600">{teams.reduce((s, t) => s + t.agents.reduce((sa, a) => sa + a.visits_remaining, 0), 0)}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">ביקורים שנותרו</p>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowCreateTeam(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">צוות שטח חדש</h3>
              <button onClick={() => setShowCreateTeam(false)} type="button" className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="שם הצוות *" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
              <input type="text" placeholder="אזור (מרכז, צפון, דרום...)" value={newTeamArea} onChange={(e) => setNewTeamArea(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
              <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || isPending} type="button" className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
                {isPending ? 'יוצר...' : 'צור צוות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
            <MapPin size={36} className="text-rose-400" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">אין צוותי שטח עדיין</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6">צור את הצוות הראשון שלך כדי להתחיל לנהל את אנשי השטח</p>
          <button onClick={() => setShowCreateTeam(true)} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-2" type="button">
            <Plus size={16} /> צור צוות ראשון
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const isExpanded = expandedTeam === team.id;
            return (
              <div key={team.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedTeam(isExpanded ? null : team.id)} type="button" className="w-full flex items-center gap-4 p-5 text-right hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0" style={{ backgroundColor: team.color }}>
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-slate-800">{team.name}</span>
                      {team.area && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{team.area}</span>}
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{team.agents.length} אנשי שטח</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                        const count = team.agents.filter(a => a.status === key).length;
                        if (count === 0) return null;
                        return <span key={key} className={`flex items-center gap-1 font-bold ${cfg.color} px-1.5 py-0.5 rounded`}>{cfg.icon} {count}</span>;
                      })}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 space-y-4 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-700">אנשי שטח ({team.agents.length})</h4>
                      <div className="flex gap-2">
                        <button onClick={() => setShowAddAgent(team.id)} type="button" className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1">
                          <UserPlus size={14} /> הוסף איש שטח
                        </button>
                        <button onClick={() => handleDeleteTeam(team.id)} type="button" className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1">
                          <Trash2 size={14} /> מחק צוות
                        </button>
                      </div>
                    </div>

                    {showAddAgent === team.id && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input type="text" placeholder="שם *" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
                          <input type="tel" placeholder="טלפון" value={newAgentPhone} onChange={(e) => setNewAgentPhone(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
                          <input type="text" placeholder="אזור" value={newAgentArea} onChange={(e) => setNewAgentArea(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAddAgent(team.id)} disabled={!newAgentName.trim() || isPending} type="button" className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50">{isPending ? 'מוסיף...' : 'הוסף'}</button>
                          <button onClick={() => setShowAddAgent(null)} type="button" className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300">ביטול</button>
                        </div>
                      </div>
                    )}

                    {team.agents.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        <Users size={24} className="mx-auto mb-2 text-slate-300" />
                        אין אנשי שטח בצוות זה
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {team.agents.map((agent) => {
                          const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.OFFLINE;
                          return (
                            <div key={agent.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-700">{agent.name.charAt(0)}</div>
                                <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${sc.dot}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-800">{agent.name}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${sc.color}`}>{sc.icon} {sc.label}</span>
                                  {agent.area && <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{agent.area}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {agent.phone && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone size={10} />{agent.phone}</span>}
                                  <span className="text-[10px] text-emerald-500 font-bold">{agent.visits_today} בוצעו</span>
                                  <span className="text-[10px] text-amber-500 font-bold">{agent.visits_remaining} נותרו</span>
                                </div>
                              </div>
                              <button onClick={() => handleDeleteAgent(team.id, agent.id)} type="button" className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
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

export default FieldMapView;

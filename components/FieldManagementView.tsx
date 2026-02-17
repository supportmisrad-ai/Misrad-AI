
import React, { useState } from 'react';
import { Lead, FieldAgent } from './system/types';
import { INITIAL_AGENTS } from './system/constants';
import { MapPin, Phone, Search, Filter, Navigation, User, Clock, CircleCheck, CircleAlert, Layers, LocateFixed } from 'lucide-react';
import { useToast } from './system/contexts/ToastContext';

interface FieldManagementViewProps {
  leads: Lead[];
}

const FieldManagementView: React.FC<FieldManagementViewProps> = ({ leads }) => {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<FieldAgent[]>(INITIAL_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<FieldAgent | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filter active leads for the map (exclude lost)
  const mapLeads = leads.filter(l => l.status !== 'lost' && l.location);

  const handleAssign = () => {
      addToast('המשימה הוקצתה לסוכן בהצלחה', 'success');
  };

  const getStatusColor = (status: FieldAgent['status']) => {
    switch (status) {
      case 'available': return 'bg-emerald-500';
      case 'busy': return 'bg-amber-500';
      case 'offline': return 'bg-slate-300';
      default: return 'bg-slate-300';
    }
  };

  const getStatusText = (status: FieldAgent['status']) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'busy': return 'עסוק';
      case 'offline': return 'מנותק';
      default: return '';
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row animate-fade-in overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm mx-auto max-w-[1920px]">
      
      {/* Sidebar: Agents List */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-b md:border-b-0 md:border-l border-slate-200 flex flex-col h-1/3 md:h-full z-20 shadow-lg md:shadow-none">
        <div className="p-6 border-b border-slate-100 bg-white z-10">
          <div className="flex items-center gap-2 mb-1 text-slate-800">
              <LocateFixed size={20} className="text-primary" />
              <h2 className="text-xl font-bold tracking-tight">צוותי שטח</h2>
          </div>
          <p className="text-slate-500 text-xs font-medium">ניהול סוכנים ומשימות (מיקום זמן אמת)</p>
          
          <div className="mt-4 relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="איתור סוכן..." 
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {agents.map(agent => (
            <div 
              key={agent.id}
              onClick={() => { setSelectedAgent(agent); setSelectedLead(null); }}
              className={`p-3 rounded-2xl cursor-pointer transition-all border group ${
                  selectedAgent?.id === agent.id 
                  ? 'bg-rose-50 border-rose-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm border border-slate-100 shadow-sm transition-colors ${selectedAgent?.id === agent.id ? 'bg-white text-primary' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}>
                    {agent.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${getStatusColor(agent.status)}`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{agent.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                        agent.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        agent.status === 'busy' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                       {getStatusText(agent.status)}
                    </span>
                  </div>
                  
                  {agent.currentTask ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate mt-1">
                       <Clock size={12} className="text-amber-500" />
                       <span className="truncate">{agent.currentTask}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                        <CircleCheck size={12} className="text-emerald-500" />
                        <span>פנוי למשימה</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedAgent?.id === agent.id && (
                 <div className="mt-3 flex gap-2 animate-fade-in">
                    <button className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-primary hover:border-rose-200 flex items-center justify-center gap-1 transition-all shadow-sm">
                        <Phone size={14} /> חייג
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleAssign(); }}
                        className="flex-1 bg-primary text-white py-2 rounded-xl text-xs font-bold hover:bg-primary-dark flex items-center justify-center gap-1 shadow-md shadow-rose-200 transition-all hover:-translate-y-0.5"
                    >
                        <Navigation size={14} /> הקצה
                    </button>
                 </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500 flex justify-between">
            <span>סוכנים מחוברים: <span className="text-slate-800">{agents.filter(a => a.status !== 'offline').length}</span></span>
            <span>סה"כ: <span className="text-slate-800">{agents.length}</span></span>
        </div>
      </div>

      {/* Main Area: Map Simulation */}
      <div className="flex-1 relative bg-slate-100/50 overflow-hidden flex flex-col h-2/3 md:h-full group">
        
        {/* Map Controls */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md shadow-lg shadow-slate-200/50 border border-white rounded-2xl px-4 py-2 pointer-events-auto flex items-center gap-3">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
                <h3 className="text-sm font-bold text-slate-800">מפה חיה</h3>
            </div>
            
            <div className="flex flex-col gap-2 pointer-events-auto">
               <button className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-100 hover:bg-slate-50 text-slate-600 hover:text-primary transition-colors">
                  <Navigation size={20} />
               </button>
               <button className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-100 hover:bg-slate-50 text-slate-600 hover:text-primary transition-colors">
                  <Layers size={20} />
               </button>
            </div>
        </div>

        {/* The Map Canvas */}
        <div className="w-full h-full relative cursor-grab active:cursor-grabbing bg-[#f1f5f9]">
           {/* Grid Pattern */}
           <div className="absolute inset-0 opacity-[0.03]" 
                style={{ 
                    backgroundImage: 'linear-gradient(#0f172a 1.5px, transparent 1.5px), linear-gradient(90deg, #0f172a 1.5px, transparent 1.5px)', 
                    backgroundSize: '40px 40px' 
                }}>
           </div>
           
           {/* Abstract Landmass */}
           <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full text-white pointer-events-none drop-shadow-xl">
              <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="#f8fafc" />
              <path d="M20,0 Q40,40 20,100 L0,100 L0,0 Z" fill="#e2e8f0" opacity="0.3" />
           </svg>

           {/* Lead Markers */}
           {mapLeads.map(lead => (
             lead.location && (
               <div 
                  key={lead.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110 hover:z-30 z-10 group/marker"
                  style={{ top: `${lead.location.y}%`, left: `${lead.location.x}%` }}
                  onClick={() => { setSelectedLead(lead); setSelectedAgent(null); }}
               >
                  <div className={`relative flex flex-col items-center ${selectedLead?.id === lead.id ? 'scale-110' : ''}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-colors ${selectedLead?.id === lead.id ? 'bg-primary text-white' : 'bg-white text-slate-500 hover:text-primary'}`}>
                          <User size={16} strokeWidth={2.5} />
                      </div>
                      {/* Triangle pointer */}
                      <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${selectedLead?.id === lead.id ? 'border-t-primary' : 'border-t-white'} mt-[-2px] drop-shadow-sm`}></div>
                      
                      {/* Hover Tooltip */}
                      <div className="absolute top-[-30px] bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {lead.name}
                      </div>
                  </div>
               </div>
             )
           ))}

           {/* Agent Markers */}
           {agents.map(agent => (
             <div 
                key={agent.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110 hover:z-40 z-20"
                style={{ top: `${agent.location.y}%`, left: `${agent.location.x}%` }}
                onClick={() => { setSelectedAgent(agent); setSelectedLead(null); }}
             >
                <div className={`relative ${selectedAgent?.id === agent.id ? 'scale-110' : ''}`}>
                   {/* Pulse Ring */}
                   {agent.status === 'available' && (
                       <div className="absolute inset-0 -m-3 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
                   )}
                   
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white transition-colors text-xs font-bold ${selectedAgent?.id === agent.id ? 'bg-primary text-white ring-4 ring-rose-500/20' : 'bg-slate-900 text-white'}`}>
                      {agent.avatar}
                   </div>
                   
                   <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-white flex items-center justify-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(agent.status)}`}></div>
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* Map Bottom Overlay: Selected Details */}
        {(selectedLead || selectedAgent) && (
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 animate-slide-up z-30 ring-1 ring-slate-900/5">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {selectedLead && (
                        <>
                            <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-primary border border-rose-100 shadow-sm">
                                    <User size={28} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-xl">{selectedLead.name}</h3>
                                    <p className="text-slate-500 text-sm flex items-center gap-1.5 font-medium mt-0.5">
                                        <MapPin size={14} /> {selectedLead.address}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button 
                                    onClick={handleAssign}
                                    className="flex-1 md:flex-none bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-rose-600/20 transition-all hover:-translate-y-0.5"
                                >
                                    שייך לסוכן קרוב
                                </button>
                            </div>
                        </>
                    )}

                    {selectedAgent && (
                        <>
                             <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {selectedAgent.avatar}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-xl">{selectedAgent.name}</h3>
                                    <div className="flex items-center gap-2 text-sm mt-0.5">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${selectedAgent.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {getStatusText(selectedAgent.status)}
                                        </span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-slate-500 font-medium">{selectedAgent.area}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto items-center">
                                {selectedAgent.currentTask ? (
                                    <div className="px-5 py-2.5 bg-amber-50 rounded-xl text-amber-800 text-sm border border-amber-100 flex items-center gap-3">
                                        <Clock size={18} />
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[10px] opacity-70 font-bold uppercase tracking-wider">משימה נוכחית</span>
                                            <span className="font-bold">{selectedAgent.currentTask}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-5 py-2.5 bg-emerald-50 rounded-xl text-emerald-800 text-sm border border-emerald-100 flex items-center gap-2 font-bold">
                                        <CircleCheck size={18} />
                                        פנוי למשימות
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default FieldManagementView;

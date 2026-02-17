import React, { useState } from 'react';
import { 
    Webhook, Lock, SquareActivity, Database, Server, CircleCheck, CircleX, 
    Clock, Zap, ArrowRight, Code2, ShieldCheck, RefreshCw, Cpu, 
    Link, MessageSquare, Mail, Smartphone, Globe, Settings2, Plus, ExternalLink
} from 'lucide-react';
import type { WebhookLog } from '@/components/system/types';
import { useToast } from '../contexts/ToastContext';
import { openComingSoon } from '@/components/shared/coming-soon';

interface IntegrationsViewProps {
  logs: WebhookLog[];
}

const IntegrationsView: React.FC<IntegrationsViewProps> = ({ logs }) => {
  const { addToast } = useToast();

  // Mock Connectivity States
  const [channels, setChannels] = useState([
    { id: 'whatsapp', name: 'WhatsApp Business API', icon: MessageSquare, status: 'active', provider: 'Meta Cloud API', latency: '12ms' },
    { id: 'email', name: 'Email Sync (G-Suite)', icon: Mail, status: 'active', provider: 'Google OAuth', latency: '45ms' },
    { id: 'sms', name: 'SMS Gateway', icon: Smartphone, status: 'inactive', provider: 'Twilio / 019', latency: '-' },
    { id: 'portal', name: 'Customer Portal events', icon: Globe, status: 'active', provider: 'Internal Native', latency: '2ms' },
  ]);

  const handleConnect = (id: string) => {
      openComingSoon();
  };

  const webhookSpec = {
    event_type: "message.received",
    timestamp: new Date().toISOString(),
    payload: {
      channel: "whatsapp",
      sender: "050-1234567",
      message: "היי, רציתי לשאול לגבי המחיר",
      metadata: {
        platform_version: "v19.0",
        message_id: "wamid.HBgLOTcyNTA..."
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-800">קישוריות וזרימת נתונים</h2>
              <p className="text-slate-500 font-medium mt-1">ניהול צנרת המידע מהלקוח למערכת (Omnichannel API)</p>
          </div>

          <div className="flex gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm min-w-[140px]">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">זמינות שרת API</div>
                  <div className="text-xl font-mono font-bold text-emerald-600 flex items-center gap-2">
                      99.98% <SquareActivity size={16} className="text-emerald-500" />
                  </div>
              </div>
          </div>
      </div>

      {/* Connectivity Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {channels.map((channel) => (
              <div key={channel.id} className={`bg-white rounded-3xl p-6 border transition-all group ${channel.status === 'active' ? 'border-slate-200' : 'border-slate-100 bg-slate-50/50'}`}>
                  <div className="flex justify-between items-start mb-6">
                      <div className={`p-3 rounded-2xl ${channel.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                          <channel.icon size={24} />
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          channel.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                          {channel.status === 'active' ? 'מחובר' : 'מנותק'}
                      </div>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 mb-1">{channel.name}</h3>
                  <p className="text-xs text-slate-500 mb-6 font-medium">{channel.provider}</p>
                  
                  {channel.status === 'active' ? (
                      <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-3">
                              <span>Latency</span>
                              <span className="text-emerald-600">{channel.latency}</span>
                          </div>
                          <button className="w-full py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center gap-2">
                              <Settings2 size={14} /> הגדרות ערוץ
                          </button>
                      </div>
                  ) : (
                      <button 
                        onClick={() => handleConnect(channel.id)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                      >
                          <Plus size={14} />
                          הגדר חיבור עכשיו
                      </button>
                  )}
              </div>
          ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Connection Visualizer & Logs */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Real-time Webhook Console */}
           <div className="ui-card overflow-hidden flex flex-col min-h-[500px]">
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-indigo-600">
                        <Cpu size={18} />
                    </div>
                    <div>
                        <span className="text-slate-800 font-bold block leading-tight">Webhook Live Stream</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">צפייה בנתונים גולמיים נכנסים</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="text-[10px] font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-500 hover:text-primary transition-all">מחק לוגים</button>
                    <button className="text-slate-400 hover:text-primary transition-colors p-2 hover:bg-white rounded-lg">
                        <RefreshCw size={14} />
                    </button>
                </div>
             </div>
             
             <div className="flex-1 p-0 overflow-x-auto custom-scrollbar bg-[#0C0C0E]">
                 {logs.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-[400px] text-slate-600 font-mono">
                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                            <SquareActivity size={32} className="opacity-40 animate-pulse" />
                         </div>
                         <p className="text-sm">Listening for incoming events...</p>
                         <p className="text-[10px] mt-2 opacity-50">Endpoint: https://api.nexus.os/v1/webhook</p>
                     </div>
                 ) : (
                     <table className="w-full text-left text-xs font-mono">
                         <thead className="bg-white/5 text-slate-500 border-b border-white/5">
                             <tr>
                                 <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">זמן (UTC)</th>
                                 <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">ערוץ</th>
                                 <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">אירוע</th>
                                 <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">סטטוס</th>
                                 <th className="px-6 py-4"></th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                             {logs.map((log) => (
                                 <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                     <td className="px-6 py-4 text-slate-400 text-right">
                                         {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <span className="text-indigo-400 font-bold">WhatsApp</span>
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <span className="text-slate-300 font-bold italic">message.inbound</span>
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">200 OK</span>
                                     </td>
                                     <td className="px-6 py-4 text-left">
                                         <button className="text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                             <Code2 size={14} />
                                         </button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 )}
             </div>
           </div>
        </div>

        {/* Right Column: Spec & Documentation */}
        <div className="space-y-6">
            
            {/* API Endpoint Config */}
            <div className="ui-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-rose-50 p-2.5 rounded-xl text-primary">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">אבטחת חיבור (Security)</h3>
                        <p className="text-xs text-slate-500">ניהול מפתחות גישה לערוצים</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">API Webhook URL</label>
                        <div className="flex gap-2">
                             <input type="text" value="https://api.nexus.os/v1/webhook" readOnly className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-mono text-slate-600" />
                             <button onClick={() => addToast('הכתובת הועתקה')} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200"><Link size={16} /></button>
                        </div>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                        <ShieldCheck size={20} className="text-emerald-600" />
                        <div>
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">SSL Encryption</p>
                            <p className="text-[10px] text-emerald-600 font-medium">החיבור מוצפן ב-AES-256 ומאושר Meta Business.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* JSON Spec Preview */}
            <div className="ui-card p-6 flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Code2 size={18} className="text-slate-400" /> 
                        Payload Structure
                    </h3>
                    <button className="text-[10px] font-bold text-indigo-600 hover:underline">Full Docs</button>
                </div>
                
                <div className="flex-1 bg-slate-900 rounded-2xl p-4 overflow-hidden relative group border border-white/5">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => addToast('JSON הועתק')} className="text-[10px] bg-white/10 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-white/20 transition-all">Copy JSON</button>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed overflow-auto h-full custom-scrollbar">
                        {JSON.stringify(webhookSpec, null, 2)}
                    </pre>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default IntegrationsView;

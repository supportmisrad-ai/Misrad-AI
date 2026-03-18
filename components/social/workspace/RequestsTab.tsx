'use client';

import React, { useState } from 'react';
import { Inbox, Send, Camera, FileText, CornerDownLeft, MessageSquare, Sparkles, Plus, X, Image } from 'lucide-react';
import { Client, ClientRequest, ManagerRequest, AIOpportunity } from '@/types/social';

interface RequestsTabProps {
  client: Client;
  requests: ClientRequest[];
  managerRequests: ManagerRequest[];
  onNewPost: (context?: Partial<AIOpportunity>) => void;
  onSendManagerRequest: (clientId: string, title: string, description: string, type: ManagerRequest['type']) => void;
  onUpdateRequestStatus: (reqId: string, status: ClientRequest['status'], comment?: string) => void;
}

const RequestsTab: React.FC<RequestsTabProps> = ({ client, requests, managerRequests, onNewPost, onSendManagerRequest, onUpdateRequestStatus }) => {
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [tempComment, setTempComment] = useState('');

  const submitComment = (reqId: string) => {
    onUpdateRequestStatus(reqId, 'needs_fix', tempComment);
    setCommentingOn(null);
    setTempComment('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6">
        <h3 className="text-xl font-bold flex items-center gap-2"><Inbox className="text-indigo-600" size={20}/> חומרים שהלקוח העלה (Inbox)</h3>
        <div className="flex flex-col gap-4">
          {requests.length > 0 ? requests.map(req => (
            <div key={req.id} className={`p-4 md:p-5 rounded-2xl border flex flex-col gap-4 transition-all ${req.status === 'processed' ? 'bg-slate-50 border-slate-100 opacity-60' : req.status === 'needs_fix' ? 'border-amber-200 bg-amber-50/50' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-200'}`}>
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  {req.mediaUrl ? <img src={req.mediaUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={24}/></div>}
                </div>
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${req.status === 'processed' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-700'}`}>{req.status === 'processed' ? 'בוצע' : 'נפתח'}</span>
                    <p className="text-[10px] font-medium text-slate-400 uppercase whitespace-nowrap">{new Date(req.timestamp).toLocaleDateString('he-IL')}</p>
                  </div>
                  <p className="font-medium text-slate-700 text-sm leading-relaxed line-clamp-3">{req.content}</p>
                </div>
              </div>
              
              {req.managerComment && (
                <div className="bg-white p-3 rounded-xl border border-amber-100 flex gap-2 text-amber-800 shadow-sm">
                  <CornerDownLeft size={14} className="shrink-0 mt-0.5 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-amber-600 tracking-wider">הערה שלך ללקוח</span>
                    <p className="text-xs font-medium mt-0.5">{req.managerComment}</p>
                  </div>
                </div>
              )}

              {req.status !== 'processed' && (
                <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onNewPost({ clientId: client.id, description: req.content, mediaUrl: req.mediaUrl, type: 'client_request' })} 
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Sparkles size={12}/> צור פוסט ✨
                    </button>
                    <button 
                      onClick={() => onUpdateRequestStatus(req.id, 'processed')}
                      className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-50 text-slate-600 transition-all"
                    >
                      סמן כבוצע
                    </button>
                  </div>
                  
                  {commentingOn === req.id ? (
                    <div className="flex-1 flex gap-1 animate-in slide-in-from-left w-full md:w-auto mt-2 md:mt-0">
                      <input 
                        autoFocus
                        value={tempComment} 
                        onChange={e => setTempComment(e.target.value)}
                        placeholder="כתוב הערה..." 
                        className="flex-1 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-400/20" 
                      />
                      <button onClick={() => submitComment(req.id)} className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg shadow-sm transition-colors"><Send size={14} className="rotate-180" /></button>
                      <button onClick={() => setCommentingOn(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={14}/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setCommentingOn(req.id)}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <MessageSquare size={12}/> החזר עם הערה
                    </button>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="py-16 flex flex-col items-center gap-3">
               <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-2"><Inbox size={28} /></div>
               <p className="text-sm font-medium text-slate-400">הלקוח טרם העלה חומרים</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2"><Send className="text-indigo-600" size={20}/> בקשות שלך ללקוח (Outbox)</h3>
          <button onClick={() => onSendManagerRequest(client.id, 'בקשת חומרים', '', 'media')} className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors"><Plus size={16}/></button>
        </div>
        <div className="flex flex-col gap-4">
          {managerRequests.length > 0 ? managerRequests.map(mr => (
            <div key={mr.id} className={`p-4 md:p-5 border rounded-2xl flex flex-col gap-3 transition-all ${mr.status === 'completed' ? 'bg-slate-50 border-slate-100 opacity-70' : mr.status === 'rejected' ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${mr.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : mr.status === 'rejected' ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                    {mr.type === 'media' ? <Camera size={18}/> : <FileText size={18}/>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{mr.title}</p>
                    <p className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-0.5">{mr.description || 'בקשה להעלאת חומרים למדיה'}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md uppercase whitespace-nowrap border ${mr.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : mr.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {mr.status === 'completed' ? 'בוצע' : mr.status === 'rejected' ? 'הלקוח דחה' : 'ממתין'}
                </span>
              </div>
              {mr.feedbackFromClient && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-2 text-slate-600 mt-1">
                  <CornerDownLeft size={14} className="shrink-0 mt-0.5 text-slate-400" />
                  <p className="text-xs font-medium">"{mr.feedbackFromClient}"</p>
                </div>
              )}
            </div>
          )) : (
            <div className="py-16 flex flex-col items-center gap-3">
               <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-2"><Send size={28} /></div>
               <p className="text-sm font-medium text-slate-400">אין בקשות פתוחות ללקוח</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsTab;


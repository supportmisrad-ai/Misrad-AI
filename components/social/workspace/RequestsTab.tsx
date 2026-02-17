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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <h3 className="text-2xl font-black flex items-center gap-3"><Inbox className="text-blue-600" size={24}/> חומרים שהלקוח העלה (Inbox)</h3>
        <div className="flex flex-col gap-6">
          {requests.length > 0 ? requests.map(req => (
            <div key={req.id} className={`p-6 rounded-[32px] border-2 flex flex-col gap-4 transition-all ${req.status === 'processed' ? 'bg-slate-50 border-transparent opacity-60' : req.status === 'needs_fix' ? 'border-amber-200 bg-amber-50/30' : 'bg-white border-slate-100 shadow-lg'}`}>
              <div className="flex gap-6 items-start">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 shrink-0 shadow-sm">
                  {req.mediaUrl ? <img src={req.mediaUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={24}/></div>}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${req.status === 'processed' ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>{req.status === 'processed' ? 'בוצע' : 'נפתח'}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(req.timestamp).toLocaleDateString('he-IL')}</p>
                  </div>
                  <p className="font-bold text-slate-800 text-base leading-relaxed">"{req.content}"</p>
                </div>
              </div>
              
              {req.managerComment && (
                <div className="bg-white p-4 rounded-2xl border border-amber-100 flex gap-3 text-amber-800">
                  <CornerDownLeft size={16} className="shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-amber-500">הערה שלך ללקוח</span>
                    <p className="text-sm font-bold">{req.managerComment}</p>
                  </div>
                </div>
              )}

              {req.status !== 'processed' && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 gap-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onNewPost({ clientId: client.id, description: req.content, mediaUrl: req.mediaUrl, type: 'client_request' })} 
                      className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <Sparkles size={14}/> צור פוסט ✨
                    </button>
                    <button 
                      onClick={() => onUpdateRequestStatus(req.id, 'processed')}
                      className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-50 transition-all"
                    >
                      סמן כבוצע
                    </button>
                  </div>
                  
                  {commentingOn === req.id ? (
                    <div className="flex-1 flex gap-2 animate-in slide-in-from-left">
                      <input 
                        autoFocus
                        value={tempComment} 
                        onChange={e => setTempComment(e.target.value)}
                        placeholder="כתוב הערה..." 
                        className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none" 
                      />
                      <button onClick={() => submitComment(req.id)} className="bg-amber-500 text-white p-2 rounded-xl shadow-md"><Send size={14} className="rotate-180" /></button>
                      <button onClick={() => setCommentingOn(null)} className="p-2 text-slate-400"><X size={14}/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setCommentingOn(req.id)}
                      className="text-xs font-black text-amber-600 hover:underline flex items-center gap-1"
                    >
                      <MessageSquare size={14}/> החזר עם הערה
                    </button>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="py-12 text-center text-slate-300 font-bold">הלקוח טרם העלה חומרים בפורטל</div>
          )}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black flex items-center gap-3"><Send className="text-blue-600" size={24}/> בקשות שלך ללקוח (Outbox)</h3>
          <button onClick={() => onSendManagerRequest(client.id, 'בקשת חומרים', '', 'media')} className="p-3 bg-slate-900 text-white rounded-xl"><Plus size={18}/></button>
        </div>
        <div className="flex flex-col gap-4">
          {managerRequests.length > 0 ? managerRequests.map(mr => (
            <div key={mr.id} className={`p-6 border border-slate-200 rounded-[32px] flex flex-col gap-4 transition-all ${mr.status === 'completed' ? 'bg-slate-50 border-transparent opacity-60' : mr.status === 'rejected' ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 shadow-md'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mr.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {mr.type === 'media' ? <Camera size={20}/> : <FileText size={20}/>}
                  </div>
                  <div>
                    <p className="font-black text-slate-800">{mr.title}</p>
                    <p className="text-[10px] font-bold text-slate-400">{mr.description || 'בקשה להעלאת חומרים למדיה'}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-4 py-1.5 rounded-xl uppercase ${mr.status === 'completed' ? 'bg-green-100 text-green-700' : mr.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                  {mr.status === 'completed' ? 'בוצע' : mr.status === 'rejected' ? 'הלקוח דחה' : 'ממתין'}
                </span>
              </div>
              {mr.feedbackFromClient && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-3 text-slate-600 italic">
                  <CornerDownLeft size={16} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-bold">"{mr.feedbackFromClient}"</p>
                </div>
              )}
            </div>
          )) : (
            <div className="py-12 text-center text-slate-300 font-bold">אין בקשות פתוחות ללקוח</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsTab;


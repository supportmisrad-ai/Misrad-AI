
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useData } from '../context/DataContext';
import { Status, Task, WorkflowStage, GuestMessage } from '../types';
import { STATUS_COLORS } from '../constants';
import { CircleCheckBig, Clock, Calendar, ArrowRight, ShieldCheck, Download, MessageSquare, Send, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export const GuestView: React.FC = () => {
  const params = useParams();
  const taskId = typeof (params as Record<string, unknown>)?.taskId === 'string' ? (params as Record<string, unknown>).taskId as string : undefined;
  const { tasks, workflowStages, addGuestMessage, approveTaskByGuest } = useData();
  const task = tasks.find((t: Task) => t.id === taskId);
  const [commentText, setCommentText] = useState('');

  if (!task) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-gray-500">
            <ShieldCheck size={48} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">הגישה נדחתה או שהלינק פג תוקף</h2>
            <p className="text-sm mt-2">אנא צור קשר עם מנהל הפרויקט לקבלת לינק חדש.</p>
        </div>
    );
  }

  // Calculate Progress
  const getProgress = (status: string) => {
      switch(status) {
          case Status.BACKLOG: return 0;
          case Status.TODO: return 10;
          case Status.IN_PROGRESS: return 50;
          case Status.WAITING: return 80;
          case Status.DONE: return 100;
          default: return 0;
      }
  };

  const progress = getProgress(task.status);
  
  // Filter messages relevant for guest (System + Guest + mentions? For now, we show all except purely internal debug)
  // In a real app, you would filter 'internal' messages. Here we show conversations.
  // We assume 'system' messages and 'guest' messages are safe.
  const visibleMessages = task.messages; 

  const handleApprove = () => {
      approveTaskByGuest(task.id);
      confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
      });
  };

  const handleSendComment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentText.trim()) return;
      addGuestMessage(task.id, commentText);
      setCommentText('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans" dir="rtl">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:px-12 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                    <div className="w-4 h-4 bg-white rounded-full opacity-90" />
                </div>
                <div>
                    <span className="font-bold text-lg tracking-tight text-gray-900 block leading-none">Nexus</span>
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">פורטל לקוחות</span>
                </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
                 <button className="text-sm font-bold text-gray-500 hover:text-black transition-colors">תמיכה</button>
                 <div className="h-4 w-px bg-gray-300"></div>
                 <div className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border border-green-100">
                    <ShieldCheck size={14} /> חיבור מאובטח
                </div>
            </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 md:p-12">
            
            <div className="mb-8">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3 inline-block">
                    סטטוס פרויקט: {workflowStages.find((s: WorkflowStage) => s.id === task.status)?.name || task.status}
                </span>
                <div className="flex justify-between items-start">
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">{task.title}</h1>
                    {task.status === Status.WAITING && (
                        <button 
                            onClick={handleApprove}
                            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Check size={20} /> אאשר שלב זה
                        </button>
                    )}
                </div>
                <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">{task.description || 'אין תיאור זמין לפרויקט זה.'}</p>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden mb-12 relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                
                <div className="p-8 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">התקדמות כללית</span>
                            <div className="text-4xl font-bold text-gray-900 flex items-center gap-2">
                                {progress}%
                                {task.status === Status.DONE && <CircleCheckBig className="text-green-500" size={32} />}
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
                             <div className="flex items-center gap-2">
                                 <Calendar size={18} className="text-gray-400" /> 
                                 <span>יעד: <span className="text-gray-900">{task.dueDate || 'לא הוגדר'}</span></span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <Clock size={18} className="text-gray-400" /> 
                                 <span>עודכן: <span className="text-gray-900">היום</span></span>
                             </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-10 shadow-inner">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden ${task.status === Status.DONE ? 'bg-green-500' : 'bg-gray-900'}`}
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                        </div>
                    </div>

                    {/* Chat / Timeline */}
                    <div className="bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <MessageSquare size={16} /> עדכונים ותגובות
                        </h3>
                        
                        <div className="space-y-6 mb-8 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {/* Start Point */}
                            <div className="relative flex gap-4">
                                <div className="relative z-10 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 font-bold text-xs">
                                    <Check size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">פרויקט נוצר</p>
                                    <span className="text-xs text-gray-400 font-mono mt-1 block">{new Date(task.createdAt).toLocaleDateString('he-IL')}</span>
                                </div>
                            </div>

                            {visibleMessages.map((msg: GuestMessage) => (
                                <div key={msg.id} className={`relative flex gap-4 ${msg.senderId === 'guest' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 font-bold text-xs
                                        ${msg.senderId === 'guest' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}
                                    `}>
                                        {msg.senderId === 'guest' ? 'אני' : 'N'}
                                    </div>
                                    <div className={`flex-1 ${msg.senderId === 'guest' ? 'text-left' : ''}`}>
                                        <div className={`p-3 rounded-2xl inline-block max-w-[85%] text-sm ${msg.senderId === 'guest' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 rounded-tl-none text-gray-800'}`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] text-gray-400 block mt-1 px-1">{msg.createdAt}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendComment} className="flex gap-2">
                            <input 
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="כתוב תגובה או הערה לצוות..."
                                className="flex-1 p-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-sm"
                            />
                            <button 
                                type="submit"
                                disabled={!commentText.trim()}
                                className="bg-black text-white p-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Downloads / Resources Placeholder */}
            {task.status === Status.DONE && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">הורד תוצרים סופיים</h3>
                            <p className="text-sm text-gray-500">חבילת קבצים (ZIP)</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </div>
            )}

            <div className="mt-12 text-center border-t border-gray-200 pt-8">
                <p className="text-sm text-gray-400">
                    מופעל על ידי <span className="font-bold text-gray-600">Misrad</span>
                </p>
            </div>
        </main>
    </div>
  );
};

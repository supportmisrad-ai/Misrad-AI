'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, FileText, Send, Loader2, Upload, AlertCircle, ImageIcon } from 'lucide-react';
import { Client, ClientRequest, SocialPlatform } from '@/types/social';
import { PLATFORM_ICONS } from '../SocialIcons';

interface UploadTabProps {
  client: Client;
  clientRequests: ClientRequest[];
  onUpload: (media: string, text: string) => void;
}

const UploadTab: React.FC<UploadTabProps> = ({ client, clientRequests, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploadText, setUploadText] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<SocialPlatform[]>([]);
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel' | ''>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const togglePlatform = (p: SocialPlatform) => {
    setTargetPlatforms(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const handleUploadSubmit = () => {
    if (!selectedFile && !uploadText) return;
    setIsUploading(true);
    
    const structuredContent = `
[סוג תוכן: ${contentType || 'לא נבחר'}]
[פלטפורמות: ${targetPlatforms.join(', ') || 'כללי'}]
[דחיפות: ${isUrgent ? 'דחוף!' : 'רגיל'}]
תיאור: ${uploadText}
    `.trim();

    setTimeout(() => {
      onUpload(selectedFile || '', structuredContent);
      setSelectedFile(null);
      setUploadText('');
      setTargetPlatforms([]);
      setContentType('');
      setIsUrgent(false);
      setIsUploading(false);
    }, 1500);
  };

  return (
    <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
          <h3 className="text-2xl font-black">העלאת חומרים חדשים</h3>
          <div className="flex flex-col gap-8">
            <div 
              onClick={() => fileRef.current?.click()}
              className="aspect-video bg-slate-50 border-4 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden relative group"
            >
              {selectedFile ? (
                <img src={selectedFile} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-300 group-hover:text-blue-500 p-8 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-2"><Camera size={40}/></div>
                  <span className="text-lg font-black">גרור תמונה או סרטון לכאן</span>
                  <span className="text-xs font-bold opacity-60">או לחץ לבחירת קובץ מהמכשיר</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />

            <div className="grid grid-cols-1 gap-8 border-t border-slate-200 pt-8">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">לאיזה רשתות זה מיועד?</label>
                <div className="flex flex-wrap gap-2">
                  {client.activePlatforms.map(p => {
                    const Icon = PLATFORM_ICONS[p];
                    const isSelected = targetPlatforms.includes(p);
                    return Icon ? (
                      <button 
                        key={p} 
                        onClick={() => togglePlatform(p)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all border-2 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                      >
                        <Icon size={14}/>
                        <span className="capitalize">{p}</span>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">סוג התוכן</label>
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
                      {[
                        { id: 'post', label: 'פוסט' },
                        { id: 'story', label: 'סטורי' },
                        { id: 'reel', label: 'רילס / וידאו' }
                      ].map(t => (
                        <button 
                          key={t.id}
                          onClick={() => setContentType(t.id as any)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${contentType === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">רמת דחיפות</label>
                    <button 
                      onClick={() => setIsUrgent(!isUrgent)}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 border-2 ${isUrgent ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                    >
                      {isUrgent ? <><AlertCircle size={16}/> דחוף - לפרסום עוד היום!</> : 'מתוזמן - ללו"ז השוטף'}
                    </button>
                  </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">הנחיות או פירוט נוסף</label>
                <textarea 
                   value={uploadText}
                   onChange={e => setUploadText(e.target.value)}
                   placeholder="מה הייתם רוצים שנכתוב או נדגיש בתוכן הזה?"
                   className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] p-6 font-bold text-sm outline-none h-32 resize-none transition-all shadow-inner"
                />
              </div>
            </div>

            <button onClick={handleUploadSubmit} disabled={isUploading || (!selectedFile && !uploadText)} className="w-full bg-slate-900 text-white py-6 rounded-[28px] font-black text-xl shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95 transition-all">
               {isUploading ? <Loader2 size={24} className="animate-spin"/> : <><Send size={24} className="rotate-180"/> שלח למנהל הסושיאל</>}
            </button>
          </div>
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col gap-6">
          <h3 className="text-xl font-black px-4">חומרים שנשלחו לאחרונה</h3>
          <div className="flex flex-col gap-4">
            {clientRequests.length > 0 ? clientRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex gap-6 hover:shadow-md transition-all group">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200 relative">
                    {req.mediaUrl ? <img src={req.mediaUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><FileText size={32}/></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase ${req.status === 'processed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                          {req.status === 'processed' ? 'טופל' : 'ממתין'}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">{new Date(req.timestamp).toLocaleDateString('he-IL')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-600 line-clamp-2 italic leading-relaxed">"{req.content}"</p>
                  </div>
              </div>
            )) : <div className="py-24 text-center text-slate-300 font-bold bg-white rounded-[48px] border-2 border-dashed flex flex-col items-center gap-4">
                <Upload size={40} className="opacity-20" />
                <p>טרם העליתם חומרים חדשים</p>
              </div>}
          </div>
      </div>
    </motion.div>
  );
};

export default UploadTab;


'use client';

import React, { useState } from 'react';
import { X, Download, FileText, TrendingUp, Users, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export default function ReportModal() {
  const { isReportModalOpen, setIsReportModalOpen } = useApp();
  useBackButtonClose(isReportModalOpen, () => setIsReportModalOpen(false));
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isReportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto" onClick={() => setIsReportModalOpen(false)} dir="rtl">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-5xl rounded-[56px] shadow-2xl flex flex-col my-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><FileText size={24}/></div>
            <h2 className="text-2xl font-black">דוח ביצועים חודשי - ינואר 2025</h2>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={async () => {
                setIsDownloading(true);
                try {
                  const response = await fetch('/api/reports/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      clientId: 'all',
                      month: 'ינואר',
                      year: '2025'
                    }),
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    // Create download link
                    const link = document.createElement('a');
                    link.href = data.pdfUrl;
                    link.download = data.filename || 'report.pdf';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } else {
                    alert('שגיאה ביצירת PDF');
                  }
                } catch (error) {
                  console.error('PDF generation error:', error);
                  alert('שגיאה ביצירת PDF');
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-slate-100 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              {isDownloading ? <>מכין קובץ...</> : <>הורד PDF <Download size={18}/></>}
            </button>
            <button onClick={() => setIsReportModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-xl"><X size={24}/></button>
          </div>
        </div>

        <div className="p-12 md:p-20 flex flex-col gap-20">
          <section className="flex flex-col gap-10">
            <h3 className="text-4xl font-black text-slate-800 tracking-tight underline decoration-blue-500 decoration-8 underline-offset-8">סיכום מנהלים</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100">
                <TrendingUp className="text-green-500 mb-6" size={40}/>
                <p className="text-5xl font-black">45%+</p>
                <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">חשיפה מצטברת</p>
              </div>
              <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100">
                <Users className="text-blue-500 mb-6" size={40}/>
                <p className="text-5xl font-black">12.4K</p>
                <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">עוקבים חדשים</p>
              </div>
              <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100">
                <Target className="text-purple-500 mb-6" size={40}/>
                <p className="text-5xl font-black">₪4.2</p>
                <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">עלות לקליק ממוצעת</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-600 leading-relaxed italic">
              "חודש ינואר התאפיין בצמיחה משמעותית בערוץ האינסטגרם, עם דגש על Reels שהגיעו לקהלים חדשים. אסטרטגיית התוכן ה-AI הוכיחה את עצמה עם עליה של 30% במעורבות."
            </p>
          </section>

          <section className="flex flex-col gap-10">
            <h3 className="text-3xl font-black">פירוט ערוצים</h3>
            <div className="flex flex-col gap-6">
              {['Instagram', 'Facebook', 'LinkedIn'].map(p => (
                <div key={p} className="bg-white border rounded-[36px] p-10 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl"></div>
                    <p className="text-2xl font-black">{p}</p>
                  </div>
                  <div className="flex gap-20">
                    <div className="text-center"><p className="text-[10px] font-black text-slate-300 uppercase">חשיפה</p><p className="text-xl font-black">125K</p></div>
                    <div className="text-center"><p className="text-[10px] font-black text-slate-300 uppercase">מעורבות</p><p className="text-xl font-black">4.2%</p></div>
                    <div className="text-center"><p className="text-[10px] font-black text-slate-300 uppercase">צמיחה</p><p className="text-xl font-black text-green-500">+12%</p></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}


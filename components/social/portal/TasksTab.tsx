'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Camera, FileText, Upload, CheckCircle, Sparkles } from 'lucide-react';
import { ManagerRequest } from '@/types/social';

interface TasksTabProps {
  requests: ManagerRequest[];
  onCompleteRequest: (reqId: string) => void;
  onUploadNow: (request: ManagerRequest) => void;
  setActiveTab: (tab: unknown) => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ requests, onCompleteRequest, onUploadNow, setActiveTab }) => {
  const activeRequests = requests.filter(r => r.status === 'pending');

  return (
    <motion.div 
      key="tasks" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex flex-col gap-10"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900">משימות עבורי מהמנהל</h2>
        <p className="text-slate-500 font-bold text-lg">פעולות או חומרים שמנהל הסושיאל שלך צריך ממך כדי להמשיך בעבודה.</p>
      </div>

      {activeRequests.length > 0 ? (
        <div className="flex flex-col gap-6">
          {activeRequests.map(mr => (
            <div key={mr.id} className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-blue-200 transition-all">
              <div className="flex items-center gap-8">
                <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center ${mr.type === 'media' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                  {mr.type === 'media' ? <Camera size={36}/> : <FileText size={36}/>}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-800">{mr.title}</h4>
                  <p className="text-slate-400 font-bold mt-1 text-lg">{mr.description}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => onUploadNow(mr)} 
                  className="bg-blue-600 text-white px-10 py-5 rounded-[24px] font-black shadow-xl shadow-blue-100 flex items-center gap-3 hover:bg-blue-700 transition-all"
                >
                  <Upload size={20}/> העלאה עכשיו
                </button>
                <button 
                  onClick={() => onCompleteRequest(mr.id)} 
                  className="bg-slate-100 text-slate-400 px-10 py-5 rounded-[24px] font-black hover:bg-slate-200 hover:text-slate-700 transition-all"
                >
                  סימון כבוצע
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 bg-white rounded-[64px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-8 text-center px-10">
          <div className="w-28 h-28 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-2">
            <CheckCircle size={56} />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-3xl font-black text-slate-800">אין בקשות פתוחות מהמנהל שלך כרגע.</h3>
            <p className="text-xl font-bold text-slate-400">עבודה מצוינת! הכל רץ כמתוכנן.</p>
          </div>
          <button 
            onClick={() => setActiveTab('calendar')}
            className="flex items-center gap-2 text-blue-600 font-black hover:underline"
          >
            לצפייה בלוח השידורים הקרוב <Sparkles size={16}/>
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default TasksTab;


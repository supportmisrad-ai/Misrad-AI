import React from 'react';
import {
  Zap,
  ClipboardList,
  Upload,
  FileSignature,
  Check,
  CircleCheckBig,
  Image,
  FileText,
  Download,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { ClientAction, ClientAsset } from '../../types';

interface PortalVaultProps {
  pendingTasks: ClientAction[];
  clientAssets: ClientAsset[];
  isUploading: string | null;
  onUpload: (id: string, title: string) => void;
  onOpenForm: (task: ClientAction) => void;
  onActionComplete: (id: string, title: string) => void;
}

export const PortalVault: React.FC<PortalVaultProps> = ({
  pendingTasks,
  clientAssets,
  isUploading,
  onUpload,
  onOpenForm,
  onActionComplete,
}) => {
  return (
    <div className="animate-slide-up space-y-10 max-w-5xl mx-auto">
      <header>
        <h2 className="text-4xl font-display font-bold text-slate-900">משימות וקבצים</h2>
        <p className="text-slate-500 mt-2 text-lg">כל מה שצריך לעשות כדי להתקדם.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <h3 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
            <Zap size={22} className="text-nexus-accent" fill="currentColor" /> משימות פתוחות
          </h3>

          <div className="space-y-4">
            {pendingTasks.map((action) => (
              <div
                key={action.id}
                className="p-6 rounded-[32px] border bg-white border-slate-200 hover:border-slate-400 group shadow-sm transition-all"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                    {action.type === 'FORM' ? (
                      <ClipboardList size={24} />
                    ) : action.type === 'UPLOAD' ? (
                      <Upload size={24} />
                    ) : (
                      <FileSignature size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg leading-tight text-slate-900">{action.title}</h4>
                    <p className="text-sm text-slate-400 mt-1">{action.description}</p>
                  </div>
                </div>

                {action.type === 'UPLOAD' && (
                  <label className="relative flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-nexus-accent transition-all cursor-pointer overflow-hidden group/upload">
                    {isUploading === action.id ? (
                      <div className="flex flex-col items-center gap-2">
                        <Skeleton className="w-6 h-6 rounded-full bg-nexus-accent/20" />
                        <span className="text-xs font-bold text-slate-400">מעלה ומאבטח...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={24} className="text-slate-300 group-hover/upload:text-nexus-accent transition-colors" />
                        <span className="text-xs font-bold text-slate-400 group-hover/upload:text-slate-600">לחץ להעלאת מסמך</span>
                      </div>
                    )}
                    <input type="file" className="hidden" onChange={() => onUpload(action.id, action.title)} />
                  </label>
                )}

                {action.type === 'FORM' && (
                  <button
                    onClick={() => onOpenForm(action)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-nexus-accent transition-all flex items-center justify-center gap-3 shadow-lg"
                  >
                    פתח שאלון אינטראקטיבי למילוי <span className="rotate-180">→</span>
                  </button>
                )}

                {(action.type === 'APPROVAL' || action.type === 'SIGNATURE') && (
                  <button
                    onClick={() => onActionComplete(action.id, action.title)}
                    className="w-full py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3"
                  >
                    לחץ לאישור סופי <Check size={16} />
                  </button>
                )}
              </div>
            ))}

            {pendingTasks.length === 0 && (
              <div className="p-12 text-center bg-green-50 rounded-[40px] border border-green-100">
                <CircleCheckBig size={48} className="mx-auto text-green-500 mb-4" />
                <h4 className="text-xl font-bold text-green-800">הכל מעודכן!</h4>
                <p className="text-green-600 mt-1">אין משימות פתוחות שדורשות את תשומת ליבך כרגע.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <h3 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
            <Image size={22} className="text-slate-300" /> ספריית מסמכים
          </h3>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50">
            {clientAssets?.map((asset) => (
              <div key={asset.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-nexus-primary transition-colors">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">{asset.name}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                      {asset.category} • {asset.date}
                    </span>
                  </div>
                </div>
                <button className="p-2 text-slate-300 hover:text-nexus-primary transition-colors">
                  <Download size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

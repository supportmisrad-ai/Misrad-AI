import React, { useState } from 'react';
import { Client } from '../../types';
import { Mail, Phone, Building, Briefcase, FileText, Calendar, Edit2, Save, X } from 'lucide-react';
import { updateClientForWorkspace } from '@/app/actions/clients';
import { getClientOsOrgId } from '../../lib/getOrgId';
import { useNexus } from '../../context/ClientContext';

export const ClientDetailsTab: React.FC<{ client: Client }> = ({ client }) => {
  const { refreshClients } = useNexus();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  // Extract custom fields if any exist in the client object, if not fallback to some default
  const [notes, setNotes] = useState((client as any).notes || (client as any).internalNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotes = async () => {
    const orgId = getClientOsOrgId();
    if (!orgId) return;

    setIsSaving(true);
    try {
      await updateClientForWorkspace(orgId, client.id, { internalNotes: notes } as any);
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'ההערות נשמרו בהצלחה', type: 'success' } }));
      await refreshClients();
      setIsEditingNotes(false);
    } catch (e) {
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'שגיאה בשמירת הערות', type: 'error' } }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building size={16} className="text-nexus-primary" />
              פרטי התקשרות
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">אימייל</div>
                  <div className="text-sm font-medium text-gray-900 break-all">{(client as any).email || 'לא הוזן אימייל'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">טלפון</div>
                  <div className="text-sm font-medium text-gray-900" dir="ltr">{(client as any).phone || 'לא הוזן טלפון'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">תעשייה</div>
                  <div className="text-sm font-medium text-gray-900">{client.industry || 'לא הוגדר'}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-nexus-primary" />
              תאריכים חשובים
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 last:pb-0">
                <span className="text-xs text-gray-500 font-bold">הצטרפות</span>
                <span className="text-sm font-medium">{(client as any).joinedAt ? new Date((client as any).joinedAt).toLocaleDateString('he-IL') : 'לא צוין'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 last:pb-0">
                <span className="text-xs text-gray-500 font-bold">חידוש קרוב</span>
                <span className="text-sm font-medium">{client.nextRenewal || 'לא צוין'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="glass-card p-6 rounded-2xl h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-nexus-primary" />
                הערות פנימיות
              </h3>
              {!isEditingNotes ? (
                <button 
                  onClick={() => setIsEditingNotes(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-nexus-primary hover:bg-nexus-primary/5 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <Edit2 size={12} /> ערוך הערות
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setNotes((client as any).notes || (client as any).internalNotes || '');
                      setIsEditingNotes(false);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <X size={12} /> ביטול
                  </button>
                  <button 
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-nexus-primary hover:bg-nexus-primary/90 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'שומר...' : <><Save size={12} /> שמור</>}
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-h-[250px]">
              {isEditingNotes ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-full min-h-[250px] p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none outline-none focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all text-sm leading-relaxed"
                  placeholder="הקלד כאן כל מידע חשוב על הלקוח, העדפות, רגישויות, וכו׳..."
                />
              ) : (
                <div className="w-full h-full min-h-[250px] p-4 bg-gray-50/50 border border-transparent rounded-xl text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                  {notes || <span className="text-gray-400 italic">אין הערות פנימיות עבור הלקוח הזה.</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

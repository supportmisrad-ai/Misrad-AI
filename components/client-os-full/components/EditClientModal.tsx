import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { X, Save, Building, Phone, Mail, User } from 'lucide-react';
import { updateClientForWorkspace } from '@/app/actions/clients';
import { getClientOsOrgId } from '../lib/getOrgId';
import { useNexus } from '../context/ClientContext';

interface EditClientModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({ client, isOpen, onClose }) => {
  const { refreshClients } = useNexus();
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    phone: '',
    email: '',
    mainContact: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client) {
      setFormData({
        name: client.name || '',
        industry: client.industry || '',
        phone: (client as any).phone || '',
        email: (client as any).email || '',
        mainContact: client.mainContact || ''
      });
    }
  }, [isOpen, client]);

  const handleSubmit = async () => {
    const orgId = getClientOsOrgId();
    if (!orgId) {
      setError('שגיאה בזיהוי הארגון');
      return;
    }

    if (!formData.name.trim()) {
      setError('שם הלקוח הוא שדה חובה');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateClientForWorkspace(orgId, client.id, {
        name: formData.name,
        industry: formData.industry,
        phone: formData.phone, // Note: Casting might be needed in action if types aren't perfectly aligned, but action supports it
        email: formData.email,
        mainContact: formData.mainContact
      } as any);

      if (result.success) {
        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'פרטי הלקוח עודכנו בהצלחה', type: 'success' } }));
        await refreshClients();
        onClose();
      } else {
        setError(result.error || 'שגיאה בעדכון הלקוח');
      }
    } catch (e) {
      setError('שגיאה בלתי צפויה');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-nexus-primary/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">עריכת פרטי לקוח</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2 flex items-center gap-1.5">
                <Building size={12} /> שם הלקוח / חברה
              </label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all font-medium"
                placeholder="שם העסק"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2 flex items-center gap-1.5">
                  <BriefcaseIcon size={12} /> תעשייה
                </label>
                <input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all"
                  placeholder="למשל: הייטק, נדל״ן"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2 flex items-center gap-1.5">
                  <User size={12} /> איש קשר ראשי
                </label>
                <input
                  value={formData.mainContact}
                  onChange={(e) => setFormData({ ...formData, mainContact: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all"
                  placeholder="שם איש הקשר"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2 flex items-center gap-1.5">
                  <Phone size={12} /> טלפון
                </label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all"
                  placeholder="050-0000000"
                  dir="ltr"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2 flex items-center gap-1.5">
                  <Mail size={12} /> אימייל
                </label>
                <input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 transition-all"
                  placeholder="name@company.com"
                  dir="ltr"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
              disabled={isSaving}
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-nexus-primary text-white rounded-xl font-bold hover:bg-nexus-primary/90 transition-all shadow-lg shadow-nexus-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
              disabled={isSaving}
            >
              {isSaving ? 'שומר...' : <><Save size={18} /> שמור שינויים</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper icon
const BriefcaseIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

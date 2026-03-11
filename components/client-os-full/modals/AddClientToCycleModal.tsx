'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, Check } from 'lucide-react';
import { addClientToCycle } from '@/app/actions/cycles';

interface Client {
  id: string;
  name: string;
  company_name?: string;
  avatar?: string;
}

interface AddClientToCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleId: string;
  existingClientIds: string[];
  availableClients: Client[];
  onSuccess?: () => void;
}

export default function AddClientToCycleModal({ 
  isOpen, 
  onClose, 
  cycleId, 
  existingClientIds, 
  availableClients,
  onSuccess 
}: AddClientToCycleModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredClients = availableClients.filter(
    client => 
      !existingClientIds.includes(client.id) &&
      (client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!selectedClientId) return;
    
    setIsSubmitting(true);
    setError('');

    const result = await addClientToCycle(cycleId, selectedClientId);

    if (result.success) {
      setSelectedClientId(null);
      setSearchTerm('');
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || 'שגיאה בהוספת הלקוח');
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900">הוספת לקוח למחזור</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-nexus-primary focus:outline-none transition-colors"
                placeholder="חפש לקוח..."
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredClients.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchTerm ? 'לא נמצאו לקוחות' : 'אין לקוחות זמינים להוספה'}
                </p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-right ${
                      selectedClientId === client.id
                        ? 'bg-nexus-primary/10 border-2 border-nexus-primary'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-nexus-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{client.name}</p>
                      {client.company_name && (
                        <p className="text-xs text-gray-500 truncate">{client.company_name}</p>
                      )}
                    </div>
                    {selectedClientId === client.id && (
                      <Check size={18} className="text-nexus-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedClientId}
                className="flex-1 px-4 py-3 bg-nexus-primary text-white rounded-xl font-bold hover:bg-nexus-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                {isSubmitting ? 'מוסיף...' : 'הוסף לקוח'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

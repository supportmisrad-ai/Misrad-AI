'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText } from 'lucide-react';
import { createAsset } from '@/app/actions/cycles';

interface UploadAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleId: string;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'GENERAL', label: 'כללי' },
  { value: 'LEGAL', label: 'משפטי' },
  { value: 'BRANDING', label: 'מיתוג' },
  { value: 'STRATEGY', label: 'אסטרטגיה' },
  { value: 'INPUT', label: 'חומרי גלם' },
];

export default function UploadAssetModal({ isOpen, onClose, cycleId, onSuccess }: UploadAssetModalProps) {
  const [name, setName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [fileType, setFileType] = useState('application/pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await createAsset({
      cycleId,
      name,
      fileUrl,
      category,
      fileType,
    });

    if (result.success) {
      setName('');
      setFileUrl('');
      setCategory('GENERAL');
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || 'שגיאה בהעלאת הקובץ');
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
            <h2 className="text-xl font-black text-gray-900">הוספת קובץ למחזור</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">שם הקובץ *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-nexus-primary focus:outline-none transition-colors"
                placeholder="למשל: חוזה שירותים - תבנית"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">קישור לקובץ *</label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-nexus-primary focus:outline-none transition-colors"
                placeholder="https://..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">העלה את הקובץ ל-Cloud Storage והדבק את הקישור</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">קטגוריה</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-nexus-primary focus:outline-none transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
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
                type="submit"
                disabled={isSubmitting || !name.trim() || !fileUrl.trim()}
                className="flex-1 px-4 py-3 bg-nexus-primary text-white rounded-xl font-bold hover:bg-nexus-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                {isSubmitting ? 'מעלה...' : 'הוסף קובץ'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

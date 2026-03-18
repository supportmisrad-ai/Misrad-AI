'use client';

/**
 * Create Service Modal
 * MISRAD AI - Add New Booking Service
 */

import { useState, useCallback } from 'react';
import { X, Briefcase, Clock, DollarSign, Palette, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgSlug: string;
}

const COLORS = [
  { value: '#4f46e5', label: 'אינדיגו' },
  { value: '#059669', label: 'אמרלד' },
  { value: '#dc2626', label: 'אדום' },
  { value: '#ea580c', label: 'כתום' },
  { value: '#0891b2', label: 'ציאן' },
  { value: '#7c3aed', label: 'סגול' },
  { value: '#db2777', label: 'ורוד' },
  { value: '#475569', label: 'אפור' },
];

export function CreateServiceModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  orgSlug 
}: CreateServiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    priceAmount: 0,
    color: '#4f46e5',
    isActive: true,
    requiresPayment: false,
    bufferMinutes: 0,
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/booking/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          name: formData.name,
          description: formData.description,
          durationMinutes: formData.durationMinutes,
          priceAmount: formData.priceAmount,
          color: formData.color,
          isActive: formData.isActive,
          requiresPayment: formData.requiresPayment,
          bufferMinutes: formData.bufferMinutes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'שגיאה בהוספת השירות');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        durationMinutes: 30,
        priceAmount: 0,
        color: '#4f46e5',
        isActive: true,
        requiresPayment: false,
        bufferMinutes: 0,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת השירות');
    } finally {
      setIsLoading(false);
    }
  }, [formData, orgSlug, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">שירות חדש</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <form id="create-service-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Service Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900">שם השירות *</Label>
              <Input
                placeholder="למשל: פגישת ייעוץ, טיפול, שיעור..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900">תיאור</Label>
              <Textarea
                placeholder="תיאור קצר של השירות..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Duration & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">משך (דקות) *</Label>
                <div className="relative">
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                    className="pr-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">מחיר (₪)</Label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    min={0}
                    value={formData.priceAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceAmount: Number(e.target.value) }))}
                    className="pr-10"
                  />
                </div>
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                צבע
              </Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: value }))}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === value 
                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: value }}
                    title={label}
                  />
                ))}
              </div>
            </div>

            {/* Buffer Time */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900">זמן מרווח בין תורים (דקות)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={formData.bufferMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, bufferMinutes: Number(e.target.value) }))}
              />
              <p className="text-xs text-slate-500">זמן המתנה בין תור לתור</p>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  formData.isActive 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {formData.isActive ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-medium">{formData.isActive ? 'פעיל' : 'לא פעיל'}</span>
                </div>
                <span className="text-sm">{formData.isActive ? 'לקוחות יוכלו לקבוע תורים' : 'לא יוצג ללקוחות'}</span>
              </button>

              {formData.priceAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, requiresPayment: !prev.requiresPayment }))}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    formData.requiresPayment 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">{formData.requiresPayment ? 'נדרש תשלום מראש' : 'ללא תשלום מראש'}</span>
                  </div>
                  <span className="text-sm">{formData.requiresPayment ? 'הלקוח ישלם בקביעה' : 'תשלום במפגש'}</span>
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            form="create-service-form"
            disabled={isLoading || !formData.name}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                מוסיף...
              </>
            ) : (
              'הוסף שירות'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

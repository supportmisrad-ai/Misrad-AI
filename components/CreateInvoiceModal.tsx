/**
 * Create Invoice Modal with Custom Design Options
 * 
 * Modal for creating invoices via מורנינג with custom design, colors, and styling
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, Image, Type, FileText, Check, Loader2 } from 'lucide-react';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (invoiceUrl: string) => void;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    defaultAmount?: number;
    defaultDescription?: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    clientName,
    clientEmail,
    clientPhone,
    defaultAmount = 0,
    defaultDescription = ''
}) => {
    const [amount, setAmount] = useState(defaultAmount.toString());
    const [description, setDescription] = useState(defaultDescription);
    const [quantity, setQuantity] = useState('1');
    const [vatRate, setVatRate] = useState('17');
    const [notes, setNotes] = useState('');
    
    // Design options
    const [showDesignOptions, setShowDesignOptions] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#10B981'); // Green default
    const [secondaryColor, setSecondaryColor] = useState('#059669');
    const [logoUrl, setLogoUrl] = useState('');
    const [fontFamily, setFontFamily] = useState('Arial');
    const [headerText, setHeaderText] = useState('');
    const [footerText, setFooterText] = useState('');
    
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!amount || !description) {
            setError('נא למלא סכום ותיאור');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const designOptions = showDesignOptions ? {
                primaryColor,
                secondaryColor,
                ...(logoUrl && { logoUrl }),
                ...(fontFamily && { fontFamily }),
                ...(headerText && { headerText }),
                ...(footerText && { footerText })
            } : undefined;

            const response = await fetch('/api/integrations/green-invoice/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientName,
                    clientEmail,
                    clientPhone,
                    items: [{
                        description,
                        quantity: Number(quantity) || 1,
                        price: Number(amount),
                        vatRate: Number(vatRate) || 17
                    }],
                    currency: 'ILS',
                    paymentMethod: 'bank_transfer',
                    notes,
                    ...(designOptions && { design: designOptions })
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create invoice');
            }

            const result = await response.json();
            onSuccess(result.invoice.invoiceUrl || result.invoice.pdfUrl || '');
            onClose();
            
            // Reset form
            setAmount(defaultAmount.toString());
            setDescription(defaultDescription);
            setQuantity('1');
            setVatRate('17');
            setNotes('');
        } catch (err: any) {
            setError(err.message || 'שגיאה ביצירת החשבונית');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    const presetColors = [
        { name: 'ירוק', primary: '#10B981', secondary: '#059669' },
        { name: 'כחול', primary: '#3B82F6', secondary: '#2563EB' },
        { name: 'סגול', primary: '#8B5CF6', secondary: '#7C3AED' },
        { name: 'אדום', primary: '#EF4444', secondary: '#DC2626' },
        { name: 'כתום', primary: '#F97316', secondary: '#EA580C' },
        { name: 'ורוד', primary: '#EC4899', secondary: '#DB2777' },
        { name: 'צהוב', primary: '#FBBF24', secondary: '#F59E0B' },
        { name: 'שחור', primary: '#1F2937', secondary: '#111827' }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto"
                >
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <FileText size={20} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">יצירת חשבונית</h3>
                                <p className="text-xs text-gray-500">לקוח: {clientName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Invoice Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    תיאור השירות/מוצר
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="לדוגמה: שירות ייעוץ חודשי"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                    disabled={isCreating}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        כמות
                                    </label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        min="0.01"
                                        step="0.01"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                        disabled={isCreating}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        מחיר (ש״ח)
                                    </label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                        disabled={isCreating}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        מע״מ (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={vatRate}
                                        onChange={(e) => setVatRate(e.target.value)}
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                        disabled={isCreating}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    הערות (אופציונלי)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="הערות נוספות לחשבונית..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none"
                                    disabled={isCreating}
                                />
                            </div>
                        </div>

                        {/* Design Options Toggle */}
                        <button
                            onClick={() => setShowDesignOptions(!showDesignOptions)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Palette size={20} className="text-gray-600" />
                                <span className="font-bold text-sm text-gray-900">עיצוב מותאם אישית</span>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 transition-colors ${showDesignOptions ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                                {showDesignOptions && <Check size={12} className="text-white m-auto" />}
                            </div>
                        </button>

                        {/* Design Options */}
                        <AnimatePresence>
                            {showDesignOptions && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    {/* Preset Colors */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3">
                                            צבעים מוכנים מראש
                                        </label>
                                        <div className="grid grid-cols-4 gap-3">
                                            {presetColors.map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    onClick={() => {
                                                        setPrimaryColor(preset.primary);
                                                        setSecondaryColor(preset.secondary);
                                                    }}
                                                    className="p-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all"
                                                    style={{
                                                        borderColor: primaryColor === preset.primary ? preset.primary : undefined
                                                    }}
                                                >
                                                    <div className="flex gap-1 mb-2">
                                                        <div
                                                            className="w-6 h-6 rounded"
                                                            style={{ backgroundColor: preset.primary }}
                                                        />
                                                        <div
                                                            className="w-6 h-6 rounded"
                                                            style={{ backgroundColor: preset.secondary }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700">{preset.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Colors */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                צבע ראשי
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={primaryColor}
                                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                                    className="w-16 h-12 rounded-lg border border-gray-200 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={primaryColor}
                                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                                    placeholder="#10B981"
                                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 outline-none focus:border-green-500 font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                צבע משני
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={secondaryColor}
                                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                                    className="w-16 h-12 rounded-lg border border-gray-200 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={secondaryColor}
                                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                                    placeholder="#059669"
                                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 outline-none focus:border-green-500 font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logo URL */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                            <Image size={16} />
                                            כתובת לוגו (URL)
                                        </label>
                                        <input
                                            type="url"
                                            value={logoUrl}
                                            onChange={(e) => setLogoUrl(e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm"
                                        />
                                    </div>

                                    {/* Font Family */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                            <Type size={16} />
                                            גופן
                                        </label>
                                        <select
                                            value={fontFamily}
                                            onChange={(e) => setFontFamily(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                        >
                                            <option value="Arial">Arial</option>
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Courier New">Courier New</option>
                                            <option value="Verdana">Verdana</option>
                                            <option value="Georgia">Georgia</option>
                                        </select>
                                    </div>

                                    {/* Header & Footer Text */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                כותרת עליונה (אופציונלי)
                                            </label>
                                            <input
                                                type="text"
                                                value={headerText}
                                                onChange={(e) => setHeaderText(e.target.value)}
                                                placeholder="תודה על העסקה!"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                כותרת תחתונה (אופציונלי)
                                            </label>
                                            <input
                                                type="text"
                                                value={footerText}
                                                onChange={(e) => setFooterText(e.target.value)}
                                                placeholder="נשמח לעזור שוב!"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                <X size={16} className="text-red-600 flex-shrink-0" />
                                <p className="text-red-800 text-sm font-bold">{error}</p>
                            </div>
                        )}
                    </div>

                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isCreating}
                            className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm disabled:opacity-50"
                        >
                            ביטול
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !amount || !description}
                            className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    יוצר חשבונית...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    צור חשבונית
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

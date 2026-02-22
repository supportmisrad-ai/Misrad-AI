/**
 * Create Invoice Modal with Custom Design Options
 * 
 * Modal for creating invoices via מורנינג with custom design, colors, and styling
 */

import React, { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Plus, Trash2, Download, Send, Palette, Image, Check, Type } from 'lucide-react';
import type { PackageType } from '@/lib/billing/pricing';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import PaywallModal from '@/components/shared/PaywallModal';
import { Skeleton } from '@/components/ui/skeletons';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

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
    useBackButtonClose(isOpen, onClose);
    const pathname = usePathname();
    const orgSlug = parseWorkspaceRoute(pathname).orgSlug;

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

    // Integration guard: check if Green Invoice is connected
    const [integrationStatus, setIntegrationStatus] = useState<'checking' | 'connected' | 'not_connected'>('checking');

    useEffect(() => {
        if (!isOpen) {
            setIntegrationStatus('checking');
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/integrations/green-invoice/status', {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : {},
                });
                if (cancelled) return;
                if (!res.ok) { setIntegrationStatus('not_connected'); return; }
                const data = await res.json() as { connected?: boolean };
                setIntegrationStatus(data.connected ? 'connected' : 'not_connected');
            } catch {
                if (!cancelled) setIntegrationStatus('not_connected');
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, orgSlug]);

    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [paywallTitle, setPaywallTitle] = useState('');
    const [paywallMessage, setPaywallMessage] = useState('');
    const [recommendedPackageType, setRecommendedPackageType] = useState<PackageType | undefined>(undefined);

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
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
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
                const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
                if (response.status === 402 && errorData?.code === 'UPGRADE_REQUIRED') {
                    const pw = errorData?.paywall as Record<string, unknown> | undefined;
                    setPaywallTitle(String(pw?.title || 'שדרוג נדרש'));
                    setPaywallMessage(String(pw?.message || errorData.error || 'פעולה זו זמינה למנויים משלמים'));
                    const pkgType = pw?.recommendedPackageType as PackageType | undefined;
                    setRecommendedPackageType(pkgType);
                    setIsPaywallOpen(true);
                    return;
                }
                throw new Error(String(errorData?.error) || 'Failed to create invoice');
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    // GUARD: Block invoice creation if integration is not connected
    if (integrationStatus !== 'connected') {
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
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-8 text-center"
                    >
                        {integrationStatus === 'checking' ? (
                            <>
                                <Skeleton className="w-14 h-14 rounded-2xl mx-auto mb-4" />
                                <Skeleton className="w-48 h-6 mx-auto mb-2" />
                                <Skeleton className="w-64 h-4 mx-auto" />
                            </>
                        ) : (
                            <>
                                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FileText size={28} className="text-red-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">אינטגרציה לא מחוברת</h3>
                                <p className="text-sm text-gray-500 mb-1">
                                    כדי להפיק חשבוניות, יש לחבר קודם את חשבון חשבונית ירוקה (Green Invoice)
                                </p>
                                <p className="text-xs text-gray-400 mb-6">
                                    ניתן לחבר דרך הגדרות → אינטגרציות במודול הפיננסי
                                </p>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
                                >
                                    הבנתי
                                </button>
                            </>
                        )}
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

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
                <PaywallModal
                    isOpen={isPaywallOpen}
                    onCloseAction={() => setIsPaywallOpen(false)}
                    title={paywallTitle}
                    message={paywallMessage}
                    reason="finance"
                    recommendedPackageType={recommendedPackageType}
                />

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
                                <Image size={16} className="text-gray-400" />
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
                                        <CustomSelect
                                            value={fontFamily}
                                            onChange={(val) => setFontFamily(val)}
                                            options={[
                                                { value: 'Arial', label: 'Arial' },
                                                { value: 'Helvetica', label: 'Helvetica' },
                                                { value: 'Times New Roman', label: 'Times New Roman' },
                                                { value: 'Courier New', label: 'Courier New' },
                                                { value: 'Verdana', label: 'Verdana' },
                                                { value: 'Georgia', label: 'Georgia' },
                                            ]}
                                        />
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
                                    <Skeleton className="w-4 h-4 rounded-full bg-white/30" />
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

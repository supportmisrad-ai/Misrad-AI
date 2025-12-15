
import React from 'react';
import { CreditCard, FileText, Download, ShieldCheck, Eye } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const BillingSettings: React.FC = () => {
    const { currentUser, invoices, hasPermission } = useData();

    // Permission Logic:
    // If user has 'view_financials' (Admin/Accountant), show ALL invoices.
    // Otherwise, show only invoices linked to the current user.
    const canViewAllBilling = hasPermission('view_financials');

    const visibleInvoices = canViewAllBilling 
        ? invoices 
        : invoices.filter(inv => inv.userId === currentUser.id);

    // Should we show billing info card? 
    // Usually only the card owner sees the card details, but for this demo, 
    // let's assume specific billing info is attached to the logged-in user context.
    const hasBillingInfo = !!currentUser.billingInfo;

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
                
                {hasBillingInfo ? (
                    <>
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">תוכנית נוכחית</p>
                                <h3 className="text-2xl font-bold">{currentUser.billingInfo?.planName}</h3>
                            </div>
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">פעיל</span>
                        </div>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg"><CreditCard size={20} /></div>
                            <div>
                                <p className="text-sm font-medium">{currentUser.billingInfo?.cardType} •••• {currentUser.billingInfo?.last4Digits}</p>
                                <p className="text-xs text-gray-400">מתחדש ב-{new Date(currentUser.billingInfo?.nextBillingDate || '').toLocaleDateString('he-IL')}</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="relative z-10 text-center py-6">
                        <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="font-bold">אין פרטי תשלום אישיים</h3>
                        <p className="text-xs text-gray-400 mt-1">אמצעי התשלום מנוהל ברמת הארגון.</p>
                    </div>
                )}
            </div>
            
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900">היסטוריית חיובים וחשבוניות</h4>
                    {canViewAllBilling && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                            <Eye size={12} /> תצוגת הנהלת חשבונות
                        </span>
                    )}
                </div>

                {visibleInvoices.length > 0 ? (
                    <div className="space-y-2">
                        {visibleInvoices.map(invoice => (
                            <div key={invoice.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><FileText size={16} /></div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-800">חשבונית #{invoice.number}</p>
                                            {invoice.clientId && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded">לקוח</span>}
                                        </div>
                                        <p className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString('he-IL')} • {invoice.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">₪{invoice.amount.toLocaleString()}</p>
                                    <button className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 justify-end ml-auto">
                                        <Download size={10} /> הורד
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        לא נמצאו חיובים להצגה.
                    </div>
                )}
            </div>
        </div>
    );
};

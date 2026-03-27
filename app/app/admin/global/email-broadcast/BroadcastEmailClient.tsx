'use client';

/**
 * Broadcast Email Client - Admin UI for creating and managing bulk emails
 * Ultra-perfectionist implementation for MISRAD AI
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Send,
  Users,
  Eye,
  Save,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createBroadcastEmail,
  previewBroadcastRecipients,
  sendBroadcastEmail,
} from '@/app/actions/email-broadcast';
import type {
  CreateBroadcastPayload,
  BroadcastRecipientFilter,
  PreviewBroadcastResult,
} from '@/types/email-broadcast';
import type { SendBroadcastResult } from '@/types/email-broadcast';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type Step = 'compose' | 'filter' | 'preview' | 'schedule';

interface BroadcastEmailClientProps {
  onComplete?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function BroadcastEmailClient({ onComplete }: BroadcastEmailClientProps) {
  const { addToast } = useData();
  
  // Step state
  const [step, setStep] = useState<Step>('compose');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [fromName, setFromName] = useState('MISRAD AI');
  const [fromEmail, setFromEmail] = useState('newsletter@misrad-ai.com');
  const [replyTo, setReplyTo] = useState('');
  const [legalCategory, setLegalCategory] = useState<'marketing' | 'legal' | 'system'>('marketing');
  const [respectPreferences, setRespectPreferences] = useState(true);
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(true);
  
  // Filter state
  const [filter, setFilter] = useState<BroadcastRecipientFilter>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  
  // Preview state
  const [previewData, setPreviewData] = useState<PreviewBroadcastResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Schedule state
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendNow, setSendNow] = useState(true);
  
  // Broadcast result
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendBroadcastResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Validation
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const isComposeValid = useMemo(() => {
    return subject.trim().length > 0 && bodyHtml.trim().length > 0;
  }, [subject, bodyHtml]);
  
  const isFilterValid = useMemo(() => {
    return selectedRoles.length > 0 || selectedPlans.length > 0;
  }, [selectedRoles, selectedPlans]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handlePreview = useCallback(async () => {
    if (!isComposeValid) {
      addToast('נא למלא נושא ותוכן מייל', 'error');
      return;
    }
    
    setIsPreviewLoading(true);
    
    const currentFilter: BroadcastRecipientFilter = {
      ...filter,
      roles: selectedRoles.length > 0 ? selectedRoles : undefined,
      plans: selectedPlans.length > 0 ? selectedPlans : undefined,
    };
    
    const result = await previewBroadcastRecipients(currentFilter);
    setPreviewData(result);
    
    if (result.success) {
      setStep('preview');
    } else {
      addToast(result.error || 'שגיאה בבדיקת נמענים', 'error');
    }
    
    setIsPreviewLoading(false);
  }, [isComposeValid, filter, selectedRoles, selectedPlans, addToast]);
  
  const handleCreateAndSend = useCallback(async () => {
    if (!isComposeValid) {
      addToast('נא למלא נושא ותוכן מייל', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    const payload: CreateBroadcastPayload = {
      subject,
      bodyHtml,
      bodyText: bodyHtml.replace(/<[^>]*>/g, ''), // Simple HTML to text
      fromName,
      fromEmail,
      replyTo: replyTo || undefined,
      recipientFilter: {
        ...filter,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
        plans: selectedPlans.length > 0 ? selectedPlans : undefined,
      },
      respectPreferences,
      includeUnsubscribe,
      legalCategory,
      scheduledAt: sendNow ? undefined : scheduledAt || undefined,
    };
    
    const result = await createBroadcastEmail(payload);
    
    if (result.success && result.broadcastId) {
      setBroadcastId(result.broadcastId);
      addToast(`נוצרה הודעה עם ${result.targetCount} נמענים`, 'success');
      
      if (sendNow) {
        // Send immediately
        const sendResult = await sendBroadcastEmail(result.broadcastId);
        setSendResult(sendResult);
        setShowResultDialog(true);
        
        if (sendResult.success) {
          addToast(`נשלח בהצלחה ל-${sendResult.sent} נמענים`, 'success');
        } else {
          addToast(`נשלח ל-${sendResult.sent} נמענים, ${sendResult.failed} נכשלו`, 'warning');
        }
      } else {
        addToast('ההודעה תישלח בתאריך המתוכנן', 'success');
        onComplete?.();
      }
    } else {
      addToast(result.error || 'שגיאה ביצירת ההודעה', 'error');
    }
    
    setIsSubmitting(false);
  }, [isComposeValid, subject, bodyHtml, fromName, fromEmail, replyTo, filter, selectedRoles, selectedPlans, respectPreferences, includeUnsubscribe, legalCategory, sendNow, scheduledAt, addToast, onComplete]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render Helpers
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const renderComposeStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="subject">נושא המייל *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="למשל: עדכון גרסה חדשה - MISRAD AI 2.0"
          className="text-right"
          dir="rtl"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="body">תוכן HTML *</Label>
        <Textarea
          id="body"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="<div style='text-align: right; direction: rtl;'>...</div>"
          rows={12}
          className="font-mono text-sm text-right"
          dir="ltr"
        />
        <p className="text-xs text-slate-500">
          תומך ב-HTML מלא. שים לב שמיילים צריכים להיות עם direction: rtl לעברית.
        </p>
      </div>
      
      <Accordion type="single" collapsible>
        <AccordionItem value="sender">
          <AccordionTrigger className="text-sm">
            הגדרות שולח מתקדמות
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromName">שם שולח</Label>
                  <Input
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="MISRAD AI"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">מייל שולח</Label>
                  <Select value={fromEmail} onValueChange={setFromEmail}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newsletter@misrad-ai.com">newsletter@misrad-ai.com</SelectItem>
                      <SelectItem value="info@misrad-ai.com">info@misrad-ai.com</SelectItem>
                      <SelectItem value="support@misrad-ai.com">support@misrad-ai.com</SelectItem>
                      <SelectItem value="itsik@misrad-ai.com">itsik@misrad-ai.com</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="replyTo">מייל לתשובה (Reply-To)</Label>
                <Input
                  id="replyTo"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="support@misrad-ai.com"
                  type="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="legalCategory">קטגוריה משפטית</Label>
                <Select 
                  value={legalCategory} 
                  onValueChange={(v) => setLegalCategory(v as 'marketing' | 'legal' | 'system')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">שיווק (Marketing)</SelectItem>
                    <SelectItem value="legal">משפטי (Legal)</SelectItem>
                    <SelectItem value="system">מערכת (System)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  קטגוריה משפטית משפיעה על אפשרות ביטול הרשמה וחובת הצגת עדכונים
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              id="respectPreferences"
              checked={respectPreferences}
              onCheckedChange={setRespectPreferences}
            />
            <Label htmlFor="respectPreferences" className="cursor-pointer">
              כבד העדפות משתמשים
            </Label>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              id="includeUnsubscribe"
              checked={includeUnsubscribe}
              onCheckedChange={setIncludeUnsubscribe}
            />
            <Label htmlFor="includeUnsubscribe" className="cursor-pointer">
              כלול קישור ביטול הרשמה
            </Label>
          </div>
        </div>
        
        <Button 
          onClick={() => setStep('filter')} 
          disabled={!isComposeValid}
          className="gap-2"
        >
          הבא: סינון נמענים
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  const renderFilterStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            סינון לפי תפקיד
          </Label>
          <div className="space-y-2">
            {['CEO', 'admin', 'manager', 'employee', 'viewer'].map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoles([...selectedRoles, role]);
                    } else {
                      setSelectedRoles(selectedRoles.filter((r) => r !== role));
                    }
                  }}
                  className="rounded border-slate-300"
                />
                <span className="text-sm">{role}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            סינון לפי חבילה
          </Label>
          <div className="space-y-2">
            {['solo', 'the_closer', 'the_authority', 'the_operator', 'the_empire', 'the_mentor'].map((plan) => (
              <label key={plan} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPlans.includes(plan)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPlans([...selectedPlans, plan]);
                    } else {
                      setSelectedPlans(selectedPlans.filter((p) => p !== plan));
                    }
                  }}
                  className="rounded border-slate-300"
                />
                <span className="text-sm">{plan}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setStep('compose')}>
          חזרה
        </Button>
        <Button 
          onClick={handlePreview} 
          disabled={isPreviewLoading}
          className="gap-2"
        >
          {isPreviewLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              בודק...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              הצג תצוגה מקדימה
            </>
          )}
        </Button>
      </div>
    </div>
  );
  
  const renderPreviewStep = () => (
    <div className="space-y-6">
      {previewData?.success ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Users className="h-5 w-5" />
              <span className="font-bold">{previewData.count} נמענים יקבלו את המייל</span>
            </div>
            <p className="text-sm text-blue-600">
              המייל יישלח ל-{previewData.count} משתמשים לפי הסינון שנבחר
            </p>
          </div>
          
          {previewData.targetUsers && previewData.targetUsers.length > 0 && (
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-right">מייל</th>
                    <th className="px-4 py-2 text-right">שם</th>
                    <th className="px-4 py-2 text-right">תפקיד</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.targetUsers.slice(0, 20).map((user, idx) => (
                    <tr key={user.id || idx} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{user.email}</td>
                      <td className="px-4 py-2">{user.name || '-'}</td>
                      <td className="px-4 py-2">{user.role || '-'}</td>
                    </tr>
                  ))}
                  {previewData.targetUsers.length > 20 && (
                    <tr className="border-t">
                      <td colSpan={3} className="px-4 py-2 text-center text-slate-500">
                        ועוד {previewData.targetUsers.length - 20} נמענים...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="border rounded-lg p-4 space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              מתי לשלוח?
            </Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={sendNow}
                  onChange={() => setSendNow(true)}
                  className="rounded-full"
                />
                <span>שלח עכשיו</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!sendNow}
                  onChange={() => setSendNow(false)}
                  className="rounded-full"
                />
                <span>תזמן לתאריך</span>
              </label>
            </div>
            
            {!sendNow && (
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-2"
              />
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep('filter')}>
              חזרה
            </Button>
            <Button 
              onClick={handleCreateAndSend}
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {sendNow ? 'שלח מייל' : 'שמור ותזמן'}
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-600">{previewData?.error || 'שגיאה בטעינת תצוגה מקדימה'}</p>
          <Button 
            variant="outline" 
            onClick={() => setStep('filter')}
            className="mt-4"
          >
            חזרה לסינון
          </Button>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">שליחת מייל מרובה נמענים</h2>
          <p className="text-slate-500">צור ושלח מיילים לקבוצות משתמשים</p>
        </div>
      </div>
      
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[
          { id: 'compose', label: 'כתיבה' },
          { id: 'filter', label: 'סינון' },
          { id: 'preview', label: 'תצוגה' },
        ].map((s, idx) => (
          <React.Fragment key={s.id}>
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                step === s.id 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : step === 'preview' && idx < 2
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step === 'preview' && idx < 2 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-xs">
                  {idx + 1}
                </span>
              )}
              {s.label}
            </div>
            {idx < 2 && <div className="w-8 h-px bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>
      
      {/* Content */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <AnimatePresence mode="wait">
          {step === 'compose' && (
            <motion.div
              key="compose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderComposeStep()}
            </motion.div>
          )}
          
          {step === 'filter' && (
            <motion.div
              key="filter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderFilterStep()}
            </motion.div>
          )}
          
          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderPreviewStep()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sendResult?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  המייל נשלח בהצלחה
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  השליחה הושלמה עם בעיות
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {sendResult && (
                <div className="mt-4 space-y-2 text-right">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-emerald-600">{sendResult.sent}</div>
                      <div className="text-xs text-emerald-600">נשלח</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-amber-600">{sendResult.skipped}</div>
                      <div className="text-xs text-amber-600">דולג</div>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-rose-600">{sendResult.failed}</div>
                      <div className="text-xs text-rose-600">נכשל</div>
                    </div>
                  </div>
                  
                  {sendResult.errors && sendResult.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">שגיאות:</p>
                      <ul className="text-xs text-rose-600 space-y-1">
                        {sendResult.errors.map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => { setShowResultDialog(false); onComplete?.(); }}>
              סגור
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

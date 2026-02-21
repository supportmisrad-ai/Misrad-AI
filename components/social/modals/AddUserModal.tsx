'use client';

import React, { useState, useRef } from 'react';
import { X, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { createUser } from '@/app/actions/admin-users';
import { UserRole } from '@/types/social';
import { Button } from '@/components/ui/button';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'team_member' as UserRole,
    plan: 'free' as 'free' | 'pro',
  });
  useBackButtonClose(isOpen, onClose);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for form fields
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const planRef = useRef<HTMLSelectElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Enter key to move to next field
  const handleKeyDown = (e: React.KeyboardEvent, nextField?: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextField?.current) {
        if (nextField.current instanceof HTMLButtonElement) {
          // If it's the submit button, trigger click
          if (!isSaving && formData.email && formData.firstName) {
            nextField.current.click();
          }
        } else {
          nextField.current.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    console.log('[AddUserModal] handleSubmit called', { formData });
    setError(null);

    if (!formData.email || !formData.firstName) {
      const errorMsg = 'נא למלא אימייל ושם פרטי';
      console.log('[AddUserModal] Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    console.log('[AddUserModal] Starting user creation...', {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      plan: formData.plan,
      hasPassword: !!formData.password,
    });

    setIsSaving(true);
    try {
      // Debug: Log what we're sending
      const userDataToSend = {
        email: formData.email?.trim(),
        firstName: formData.firstName?.trim(),
        lastName: formData.lastName?.trim() || undefined,
        password: formData.password?.trim() || undefined,
        role: formData.role,
        plan: formData.plan,
      };
      console.log('[AddUserModal] Sending user data:', JSON.stringify(userDataToSend, null, 2));
      console.log('[AddUserModal] Email value:', JSON.stringify(userDataToSend.email));
      console.log('[AddUserModal] Email type:', typeof userDataToSend.email);
      console.log('[AddUserModal] Email length:', userDataToSend.email?.length);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: יצירת משתמש לוקחת יותר מדי זמן')), 30000)
      );
      
      const resultUnknown = await Promise.race([
        createUser(userDataToSend),
        timeoutPromise
      ]) as unknown;
      const result = resultUnknown as Record<string, unknown>;

      console.log('[AddUserModal] createUser result:', result);
      console.log('[AddUserModal] createUser result details:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('[AddUserModal] User created successfully!');
        // Wait a bit to ensure user is saved in DB
        await new Promise(resolve => setTimeout(resolve, 500));
        onSuccess();
        handleClose();
      } else {
        // Ensure error message is in Hebrew
        let errorMsg = String(result.error || 'שגיאה ביצירת משתמש');
        
        console.error('[AddUserModal] Error creating user:', errorMsg);
        console.error('[AddUserModal] Full error result:', JSON.stringify(result, null, 2));
        
        // Translate common errors to Hebrew
        const errorLower = errorMsg.toLowerCase();
        
        if (errorLower.includes('unprocessable entity') || errorLower.includes('422')) {
          errorMsg = 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים';
        } else if (errorLower.includes('bad request') || errorLower.includes('400')) {
          errorMsg = 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים';
        } else if (errorLower.includes('email') && (errorLower.includes('already') || errorLower.includes('exists') || errorLower.includes('duplicate'))) {
          errorMsg = 'האימייל כבר קיים במערכת';
        } else if (errorLower.includes('password') && errorLower.includes('short')) {
          errorMsg = 'הסיסמה קצרה מדי. נא להזין סיסמה של לפחות 8 תווים';
        } else if (errorLower.includes('password') && errorLower.includes('required')) {
          errorMsg = 'נדרשת סיסמה';
        } else if (errorLower.includes('invalid') && errorLower.includes('email')) {
          errorMsg = 'כתובת אימייל לא תקינה';
        } else if (errorLower.includes('form_identifier_exists')) {
          errorMsg = 'האימייל כבר קיים במערכת';
        }
        
        console.error('[AddUserModal] Setting error message:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown>;
      let errorMsg = String(errorObj.message || 'שגיאה ביצירת משתמש');
      
      // Translate common errors to Hebrew
      const errorLower = errorMsg.toLowerCase();
      
      if (errorLower.includes('unprocessable entity') || errorLower.includes('422')) {
        errorMsg = 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים';
      } else if (errorLower.includes('bad request') || errorLower.includes('400')) {
        errorMsg = 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים';
      }
      
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'team_member' as UserRole,
      plan: 'free',
    });
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">הוסף משתמש חדש</h2>
              <p className="text-sm text-slate-600">צור משתמש חדש במערכת</p>
            </div>
          </div>
          <Button onClick={handleClose} variant="ghost" size="icon" className="h-11 w-11">
            <X size={24} />
          </Button>
        </div>

        <form 
          onSubmit={(e) => {
            console.log('[AddUserModal] Form submitted');
            handleSubmit(e);
          }} 
          className="p-10 flex-1 overflow-y-auto"
        >
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <p className="text-sm font-black text-rose-600">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">שם פרטי *</label>
                <input
                  ref={firstNameRef}
                  type="text"
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, lastNameRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50"
                  placeholder="שם פרטי"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">שם משפחה</label>
                <input
                  ref={lastNameRef}
                  type="text"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, emailRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50"
                  placeholder="שם משפחה"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-400 mb-2">אימייל *</label>
              <input
                ref={emailRef}
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50"
                placeholder="דוא&quot;ל"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-400 mb-2">סיסמה (אופציונלי)</label>
              <input
                ref={passwordRef}
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, roleRef)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50"
                placeholder="אם לא תזין, המשתמש יקבל הזמנה באימייל"
              />
              <p className="text-xs text-slate-500 mt-2">אם לא תזין סיסמה, המשתמש יקבל הזמנה באימייל להגדרת סיסמה</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">תפקיד</label>
                <select
                  ref={roleRef}
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  onKeyDown={(e) => handleKeyDown(e, planRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50"
                >
                  <option value="team_member">חבר צוות</option>
                  <option value="owner">בעלים</option>
                  <option value="super_admin">מנהל מערכת</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-400 mb-2">חבילה</label>
                <select
                  ref={planRef}
                  value={formData.plan}
                  onChange={e => setFormData({ ...formData, plan: e.target.value as 'free' | 'pro' })}
                  onKeyDown={(e) => handleKeyDown(e, submitButtonRef)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 ring-blue-50"
                >
                  <option value="free">Free</option>
                  <option value="pro">PRO</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-200 flex gap-4 mt-6">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 py-4 rounded-2xl font-black"
            >
              ביטול
            </Button>
            <Button
              ref={submitButtonRef}
              type="submit"
              onClick={(e) => {
                console.log('[AddUserModal] Submit button clicked');
                e.preventDefault();
                handleSubmit(e);
              }}
              disabled={!formData.email || !formData.firstName || isSaving}
              className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
            {isSaving ? (
              <>יוצר...</>
            ) : (
              <>
                <UserPlus size={20} />
                צור משתמש
              </>
            )}
          </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


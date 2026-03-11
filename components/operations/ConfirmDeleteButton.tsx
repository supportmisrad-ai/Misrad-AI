'use client';

import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConfirmDeleteButton({
  id,
  action,
  label,
  confirmMessage,
  className,
}: {
  id: string;
  action: (formData: FormData) => void;
  label?: string;
  confirmMessage?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    formRef.current?.requestSubmit();
  }, []);

  return (
    <>
      <form ref={formRef} action={action}>
        <input type="hidden" name="id" value={id} />
        <button type="button" onClick={handleClick} className={className}>
          {label || 'מחק'}
        </button>
      </form>

      {open ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-sm mx-4 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="text-sm font-black text-slate-900 mb-2">אישור מחיקה</div>
            <div className="text-sm text-slate-600 mb-5">
              {confirmMessage || 'האם אתה בטוח שברצונך למחוק? פעולה זו אינה ניתנת לביטול.'}
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition"
              >
                מחק
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

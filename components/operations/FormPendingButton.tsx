'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

export function FormPendingButton({
  children,
  className,
  pendingText,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={className}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          {pendingText || 'מעבד...'}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

'use client';

import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { impersonateUser } from '@/app/actions/admin';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';

export default function OrgImpersonateButton(props: {
  orgSlug: string | null;
  fallbackOrgId: string;
  clientId: string | null;
}) {
  const { addToast } = useData();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handle = async () => {
    const clientId = props.clientId;
    if (!clientId) {
      addToast('לא נמצא מזהה לקוח לארגון (לא ניתן להתחזות)', 'error');
      return;
    }

    const orgSlug = props.orgSlug || props.fallbackOrgId;

    setIsLoading(true);
    try {
      const res = await impersonateUser(clientId);
      if (!res.success) {
        addToast(res.error || 'שגיאה בהתחזות', 'error');
        return;
      }

      addToast('נכנסת למצב התחזות - מעביר למרחב העבודה...', 'success');
      router.push(`/w/${encodeURIComponent(String(orgSlug))}/nexus`);
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בהתחזות', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handle}
      disabled={isLoading || !props.clientId}
      variant="outline"
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border font-black transition-colors ${
        isLoading || !props.clientId
          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
          : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
      }`}
      title="התחזות"
    >
      <Eye size={16} />
      התחזות
    </Button>
  );
}

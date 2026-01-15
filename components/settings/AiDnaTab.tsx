'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';
import { useData } from '@/context/DataContext';

type AiDna = {
  vision?: string;
  tone?: string;
  advantages?: string;
  targetAudience?: string;
  profitGoals?: string;
  vocabulary?: string;
};

export const AiDnaTab: React.FC = () => {
  const pathname = usePathname();
  const orgSlug = getWorkspaceOrgIdFromPathname(pathname);
  const { addToast } = useData();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dna, setDna] = useState<AiDna>({});

  const endpoint = useMemo(() => {
    if (!orgSlug) return null;
    return `/api/workspaces/${encodeURIComponent(orgSlug)}/ai-dna`;
  }, [orgSlug]);

  useEffect(() => {
    const load = async () => {
      if (!endpoint) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) {
          setDna({});
          return;
        }
        const data = await res.json().catch(() => ({}));
        setDna((data?.aiDna || {}) as AiDna);
      } catch {
        setDna({});
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [endpoint]);

  const save = async () => {
    if (!endpoint) return;

    setIsSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ aiDna: dna }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data?.error || 'שמירה נכשלה', 'error');
        return;
      }

      addToast('ה-DNA נשמר', 'success');
    } catch {
      addToast('שמירה נכשלה', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!orgSlug) {
    return (
      <div className="p-6">
        <div className="text-gray-700">לא נמצא ארגון פעיל במסלול הנוכחי.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">DNA עסקי ל-AI</h2>
        <p className="text-sm text-gray-600 mt-1">
          ממלאים פעם אחת. ה-AI ישתמש בזה בכל המודולים (סושיאל, נקסוס, התמודדות עם התנגדויות).
        </p>
      </div>

      {isLoading ? (
        <div className="text-gray-600">טוען…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">חזון העסק</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              rows={3}
              value={dna.vision || ''}
              onChange={(e) => setDna((p) => ({ ...p, vision: e.target.value }))}
              placeholder="משפט-שניים: לאן העסק הולך ומה חשוב לנו"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">טון דיבור ברירת מחדל</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              rows={2}
              value={dna.tone || ''}
              onChange={(e) => setDna((p) => ({ ...p, tone: e.target.value }))}
              placeholder="לדוגמה: מקצועי, בגובה העיניים, ישראלי, בלי חפירות"
            />
            <div className="text-xs text-gray-500 mt-1">אפשר לשנות נקודתית בפוסט ספציפי (Override), אבל זה יהיה ברירת המחדל.</div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">יתרונות מרכזיים</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              rows={3}
              value={dna.advantages || ''}
              onChange={(e) => setDna((p) => ({ ...p, advantages: e.target.value }))}
              placeholder="בולטים לעומת המתחרים: מה אנחנו עושים יותר טוב"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">קהל יעד</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              rows={2}
              value={dna.targetAudience || ''}
              onChange={(e) => setDna((p) => ({ ...p, targetAudience: e.target.value }))}
              placeholder="מי הלקוח האידיאלי, מה כואב לו, מה חשוב לו"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">יעדי רווח / מספרים (לא חובה)</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              rows={2}
              value={dna.profitGoals || ''}
              onChange={(e) => setDna((p) => ({ ...p, profitGoals: e.target.value }))}
              placeholder="לדוגמה: יעד רווח חודשי, יעד MRR, יעד לקוחות"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">מילים/סגנון מועדף (אופציונלי)</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              rows={2}
              value={dna.vocabulary || ''}
              onChange={(e) => setDna((p) => ({ ...p, vocabulary: e.target.value }))}
              placeholder="מילים שחוזרות אצלנו, ביטויים, דברים להימנע מהם"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-50"
              onClick={save}
              disabled={isSaving}
            >
              {isSaving ? 'שומר…' : 'שמור'}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm font-bold"
              onClick={() => setDna({})}
            >
              נקה
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

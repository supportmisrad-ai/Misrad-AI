/**
 * Shared formatting helpers for the Operations module.
 * Extracted to avoid duplication across pages and components.
 */

export function formatWorkOrderStatus(status: string): { label: string; cls: string } {
  switch (status) {
    case 'NEW':
      return { label: 'נפתח', cls: 'bg-sky-50 text-sky-700 border border-sky-100' };
    case 'OPEN':
      return { label: 'פתוח', cls: 'bg-blue-50 text-blue-700 border border-blue-100' };
    case 'IN_PROGRESS':
      return { label: 'בטיפול', cls: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'DONE':
      return { label: 'הושלם', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    default:
      return { label: status, cls: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }
}

export function formatProjectStatus(status: string): { label: string; cls: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'פעיל', cls: 'bg-sky-50 text-sky-700 border border-sky-100' };
    case 'COMPLETED':
      return { label: 'הושלם', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    case 'ON_HOLD':
      return { label: 'מוקפא', cls: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'CANCELLED':
      return { label: 'בוטל', cls: 'bg-slate-50 text-slate-500 border border-slate-200' };
    default:
      return { label: status, cls: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }
}

export function formatPriority(priority: string): { label: string; cls: string } | null {
  switch (priority) {
    case 'HIGH':
      return { label: 'גבוה', cls: 'bg-orange-50 text-orange-700 border border-orange-100' };
    case 'URGENT':
      return { label: 'דחוף', cls: 'bg-rose-50 text-rose-700 border border-rose-100' };
    case 'CRITICAL':
      return { label: 'קריטי', cls: 'bg-red-100 text-red-800 border border-red-200' };
    default:
      return null;
  }
}

export function slaLabel(deadline: string | null): { text: string; cls: string } | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (isNaN(diff)) return null;
  if (diff <= 0) return { text: 'חריגה', cls: 'text-red-700 font-black' };
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return { text: `${Math.floor(diff / 60000)} דק׳`, cls: 'text-orange-700 font-bold' };
  if (hrs < 24) return { text: `${hrs} שעות`, cls: 'text-amber-700 font-bold' };
  return { text: `${Math.floor(hrs / 24)} ימים`, cls: 'text-slate-600' };
}

export function formatSla(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} דק׳`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} שעות ו-${m} דק׳` : `${h} שעות`;
}

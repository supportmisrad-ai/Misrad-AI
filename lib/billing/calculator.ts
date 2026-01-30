export type BillingCadence = 'monthly' | 'yearly';

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfUtcYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
}

function addUtcMonths(d: Date, months: number): Date {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  const targetMonth = month + months;
  const base = new Date(Date.UTC(year, targetMonth, 1, hour, minute, second, ms));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, lastDay));
  return base;
}

function addUtcYears(d: Date, years: number): Date {
  const year = d.getUTCFullYear() + years;
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  const base = new Date(Date.UTC(year, month, 1, hour, minute, second, ms));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, lastDay));
  return base;
}

function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function calculateSeatCharge(params: {
  startAt: string | Date;
  endAt: string | Date;
  seats: number;
  unitAmount?: number;
  cadence?: BillingCadence;
}): { amount: number; fraction: number } {
  const start = toDate(params.startAt);
  const end = toDate(params.endAt);

  const seatsRaw = params.seats;
  const seats = Number.isFinite(Number(seatsRaw)) ? Math.floor(Number(seatsRaw)) : 0;
  const unitAmount = Number.isFinite(Number(params.unitAmount)) ? Number(params.unitAmount) : 39;
  const cadence: BillingCadence = params.cadence === 'yearly' ? 'yearly' : 'monthly';

  if (!seats || seats <= 0) return { amount: 0, fraction: 0 };
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return { amount: 0, fraction: 0 };
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) return { amount: 0, fraction: 0 };
  if (end <= start) return { amount: 0, fraction: 0 };

  if (cadence === 'yearly') {
    const periodEnd = end;
    const periodStart = addUtcYears(periodEnd, -1);
    const normalizedStart = start < periodStart ? periodStart : start;
    const fraction = clamp01((periodEnd.getTime() - normalizedStart.getTime()) / (periodEnd.getTime() - periodStart.getTime()));
    return { amount: roundCurrency(seats * unitAmount * fraction), fraction };
  }

  const periodEnd = end;
  const periodStart = addUtcMonths(periodEnd, -1);
  const normalizedStart = start < periodStart ? periodStart : start;
  const fraction = clamp01((periodEnd.getTime() - normalizedStart.getTime()) / (periodEnd.getTime() - periodStart.getTime()));
  return { amount: roundCurrency(seats * unitAmount * fraction), fraction };
}

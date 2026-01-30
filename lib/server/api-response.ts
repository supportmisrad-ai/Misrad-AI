import { NextResponse } from 'next/server';
import { translateError } from '@/lib/errorTranslations';

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getNumberProp(obj: Record<string, unknown> | null, key: string): number | null {
  const v = obj?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  return typeof v === 'string' ? v : null;
}

function getErrorStatus(error: unknown): number {
  const e = asObject(error);
  const status = getNumberProp(e, 'status');
  if (status != null) return status;
  const statusCode = getNumberProp(e, 'statusCode');
  if (statusCode != null) return statusCode;

  if (getStringProp(e, 'name') === 'UpgradeRequiredError') return 402;
  if (String(getStringProp(e, 'code') || '').toUpperCase() === 'UPGRADE_REQUIRED') return 402;

  const msg = String(getStringProp(e, 'message') || error || '').toLowerCase();
  if (msg.includes('unauthorized')) return 401;
  if (msg.includes('forbidden')) return 403;
  if (msg.includes('not found') || msg.includes('not_found') || msg.includes('notfound')) return 404;

  return 500;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return translateError(error.message) || error.message || fallback;
  }
  if (typeof error === 'string') {
    return translateError(error) || error || fallback;
  }
  const obj = asObject(error);
  const msgValue = obj?.message;
  if (typeof msgValue === 'string') {
    const msg = msgValue.trim();
    return translateError(msg) || msg || fallback;
  }
  return fallback;
}

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, init);
}

export function apiSuccessCompat<T extends Record<string, unknown>>(
  data: T,
  init?: ResponseInit
): NextResponse<ApiSuccess<T> & T> {
  return NextResponse.json({ success: true, data, ...data }, init);
}

export function apiError(
  error: unknown,
  opts?: {
    status?: number;
    message?: string;
    headers?: HeadersInit;
  }
): NextResponse<ApiFailure> {
  const status = typeof opts?.status === 'number' ? opts.status : getErrorStatus(error);
  const message = getErrorMessage(error, opts?.message || 'שגיאה לא צפויה');
  return NextResponse.json({ success: false, error: message }, { status, headers: opts?.headers });
}

export function apiErrorCompat(
  error: unknown,
  opts?: {
    status?: number;
    message?: string;
    headers?: HeadersInit;
    extra?: Record<string, unknown>;
  }
): NextResponse<ApiFailure & Record<string, unknown>> {
  const status = typeof opts?.status === 'number' ? opts.status : getErrorStatus(error);
  const message = getErrorMessage(error, opts?.message || 'שגיאה לא צפויה');
  return NextResponse.json(
    { success: false, error: message, ...(opts?.extra || {}) },
    { status, headers: opts?.headers }
  );
}

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}
export function asObjectLoose(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return null;
}

export function getUnknownErrorMessage(error: unknown): string | null {
  const msg = getErrorMessage(error);
  return msg ? msg : null;
}

export function getErrorMessageOr(error: unknown, fallback: string): string {
  const msg = getErrorMessage(error);
  return msg || fallback;
}

export function getErrorMessageFromErrorOr(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getUnknownErrorMessageOrUnexpected(error: unknown): string {
  return getErrorMessageOr(error, 'שגיאה לא צפויה');
}

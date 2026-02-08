export type ComingSoonDetail = {
  message?: string;
};

export const COMING_SOON_EVENT_NAME = 'misrad-coming-soon';

export function openComingSoon(detail?: ComingSoonDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMING_SOON_EVENT_NAME, { detail: detail || {} }));
}

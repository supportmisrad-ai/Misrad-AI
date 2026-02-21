'use client';

import { useEffect, useRef } from 'react';

let registeredCount = 0;
let suppressPopStateCount = 0;

/**
 * Intercepts the mobile/browser back button when a modal/popup is open,
 * closing the modal instead of navigating away from the page.
 *
 * Usage:
 *   useBackButtonClose(isOpen, onClose);
 *   useBackButtonClose(true, onClose); // for always-mounted modals
 */
export function useBackButtonClose(isOpen: boolean, onClose: () => void): void {
  const idRef = useRef<number>(0);
  const closedByPopStateRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    registeredCount++;
    const id = registeredCount;
    idRef.current = id;
    closedByPopStateRef.current = false;

    history.pushState({ __modal: id }, '');

    const handlePopState = () => {
      if (suppressPopStateCount > 0) {
        suppressPopStateCount--;
        return;
      }
      if (id === registeredCount) {
        closedByPopStateRef.current = true;
        registeredCount--;
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closedByPopStateRef.current && registeredCount >= id) {
        registeredCount = id - 1;
        suppressPopStateCount++;
        history.back();
      }
    };
  }, [isOpen]);
}

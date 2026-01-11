'use client';

import { useEffect, useState } from 'react';

export const PWAInstaller = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        setShowInstallButton(false);
        return true;
      }
      // Also check if running as PWA
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        setShowInstallButton(false);
        return true;
      }
      return false;
    };

    if (checkInstalled()) {
      return;
    }

    // Check if we're in development mode
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.port !== '';
    
    // In development, unregister any existing service workers to avoid conflicts
    if (isDev && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      });
      // Don't register service worker in dev mode
      return;
    }
    
    // Register service worker only in production
    if ('serviceWorker' in navigator && !isDev) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch((error) => {
          console.warn('⚠️ Service Worker registration failed:', error);
          // Don't block PWA prompt if service worker fails
        });
    }

    // Listen for beforeinstallprompt event (this is the key event for PWA install)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('✅ PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also check if app is installable (for browsers that support it)
    const checkInstallability = async () => {
      // Wait a bit for manifest to load
      setTimeout(() => {
        if (!deferredPrompt && !isInstalled) {
          // Check if manifest is accessible
          fetch('/manifest.json')
            .then(res => {
              if (res.ok) {
                console.log('✅ Manifest.json is accessible');
                // In some cases, we might want to show a manual install button
                // But we'll wait for beforeinstallprompt first
              }
            })
            .catch(err => {
              console.warn('⚠️ Could not load manifest.json:', err);
            });
        }
      }, 1000);
    };

    checkInstallability();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback: show instructions for manual install
      alert('להתקנה ידנית:\n1. לחץ על תפריט הדפדפן (3 נקודות)\n2. בחר "התקן אפליקציה" או "Add to Home Screen"');
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User ${outcome} the install prompt`);
      
      if (outcome === 'accepted') {
        setShowInstallButton(false);
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    // Store dismissal in localStorage to not show again for this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  // Check if user dismissed the prompt in this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('pwa-install-dismissed');
      if (dismissed === 'true') {
        setShowInstallButton(false);
      }
    }
  }, []);

  if (!showInstallButton || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl shadow-2xl p-5 flex items-center gap-4 max-w-md mx-auto backdrop-blur-sm">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base mb-1">התקן את Misrad OS</p>
          <p className="text-xs text-gray-600 leading-relaxed">גישה מהירה מהמסך הבית, ללא צורך בדפדפן</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            התקן
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="סגור"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};


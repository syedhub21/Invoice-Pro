'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Don't register service worker in Capacitor/WebView - it causes issues
      // Capacitor apps serve files locally, no SW needed
      const isCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
      const isWebView = /(wv|ip(hone|od|ad).*os.*applewebkit(?!.*safari))/i.test(navigator.userAgent);
      
      if (isCapacitor || isWebView) {
        console.log('Running in Capacitor/WebView - skipping service worker registration');
        // Unregister any existing service workers that might cause issues
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.log('Unregistered old service worker');
          });
        }).catch(() => {});
        return;
      }
      
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => { console.log('SW registered:', registration.scope); })
        .catch((error) => { console.log('SW registration failed:', error); });
    }
  }, []);
  return null;
}

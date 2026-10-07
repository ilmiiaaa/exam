import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { probeServerAssetsUpdate, checkFirestoreSystemUpdate } from '../lib/appUpdateManager';

interface AutoUpdateNotificationProps {
  currentScreen: 'login' | 'exam' | 'result' | 'teacher';
}

export const AutoUpdateNotification: React.FC<AutoUpdateNotificationProps> = ({ currentScreen }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  
  // Stored version timestamp
  const getStoredVersionTime = (): number => {
    try {
      const val = localStorage.getItem('exam_edu_last_known_version_time');
      return val ? Number(val) : 0;
    } catch {
      return 0;
    }
  };

  const lastKnownVersionRef = useRef<number>(getStoredVersionTime());
  const isReloadingRef = useRef(false);

  // Perform clean reload with cache-busting
  const triggerAppReload = (message: string) => {
    if (isReloadingRef.current) return;

    // Safety: If student is actively taking an exam, DO NOT reload to avoid disrupting them!
    if (currentScreen === 'exam') {
      console.log('Exam in progress, postponing full page reload.');
      return;
    }

    isReloadingRef.current = true;
    setIsUpdating(true);
    setUpdateMessage(message);

    setTimeout(() => {
      // Force cache-busting reload by updating search params or hash
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_sync', String(Date.now()));
        window.location.replace(url.toString());
      } catch (e) {
        window.location.reload();
      }
    }, 1200);
  };

  // Check for updates on demand (when app is opened, resumed from background/minimize)
  const checkForUpdates = async (triggerReason: string) => {
    if (isReloadingRef.current || currentScreen === 'exam') return;

    try {
      // 1. Check if newer build scripts/assets exist on the server
      const hasAssetsUpdate = await probeServerAssetsUpdate();
      if (hasAssetsUpdate) {
        triggerAppReload('Versi aplikasi baru tersedia. Memperbarui halaman...');
        return;
      }

      // 2. Check if Firestore has a newer system version broadcast
      const currentStored = lastKnownVersionRef.current || getStoredVersionTime();
      const firestoreUpdate = await checkFirestoreSystemUpdate(currentStored);
      if (firestoreUpdate.hasUpdate) {
        lastKnownVersionRef.current = firestoreUpdate.timestamp;
        try {
          localStorage.setItem('exam_edu_last_known_version_time', String(firestoreUpdate.timestamp));
        } catch (e) {}

        const note = firestoreUpdate.notes ? `: ${firestoreUpdate.notes}` : '';
        triggerAppReload(`Pembaruan sistem terdeteksi${note}. Memperbarui aplikasi...`);
        return;
      }
    } catch (e) {
      console.warn('Update check probe error:', e);
    }
  };

  // 1. Check for update on initial mount (when app is opened)
  useEffect(() => {
    checkForUpdates('mount');
  }, []);

  // 2. Real-time Firestore version broadcast listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system_version'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const remoteTime = Number(data.timestamp) || 0;
        const localTime = lastKnownVersionRef.current;

        if (localTime > 0 && remoteTime > localTime) {
          lastKnownVersionRef.current = remoteTime;
          try {
            localStorage.setItem('exam_edu_last_known_version_time', String(remoteTime));
          } catch (e) {}

          const note = data.notes ? `: ${data.notes}` : '';
          triggerAppReload(`Pembaruan sistem terdeteksi${note}. Memperbarui aplikasi...`);
        } else if (!localTime || localTime === 0) {
          lastKnownVersionRef.current = remoteTime;
          try {
            localStorage.setItem('exam_edu_last_known_version_time', String(remoteTime));
          } catch (e) {}
        }
      }
    }, (err) => {
      console.warn('System version sync note:', err);
    });

    return () => unsub();
  }, [currentScreen]);

  // 3. Mobile Lifecycle Listeners: Detect when app is opened or resumed after being minimized (recent apps)
  useEffect(() => {
    const handleAppResumed = () => {
      if (document.visibilityState === 'visible') {
        console.log('App resumed from background/recent apps. Checking for updates...');
        checkForUpdates('resumed');
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted is true when restored from mobile browser back-forward cache / recent apps
      console.log('Pageshow event triggered, persisted:', event.persisted);
      checkForUpdates('pageshow');
    };

    const handleWindowFocus = () => {
      checkForUpdates('focus');
    };

    const handleOnline = () => {
      checkForUpdates('online');
    };

    document.addEventListener('visibilitychange', handleAppResumed);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    // Periodic check every 30 seconds when app is active (idle safeguard)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdates('periodic');
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleAppResumed);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [currentScreen]);

  if (!isUpdating) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl border-2 border-indigo-200 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>PEMBARUAN SISTEM</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 font-heading">
            Memperbarui Aplikasi
          </h3>
          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
            {updateMessage || 'Memuat versi sistem terbaru untuk memastikan kelancaran ujian...'}
          </p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

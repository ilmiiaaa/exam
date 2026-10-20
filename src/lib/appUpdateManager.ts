import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export const LOCAL_APP_VERSION = '2.1.0';

// Store loaded scripts snapshot to compare against remote index.html on resume
let initialScriptHashes: string[] = [];

if (typeof document !== 'undefined') {
  initialScriptHashes = Array.from(document.querySelectorAll('script[src]'))
    .map((s) => (s as HTMLScriptElement).getAttribute('src') || '')
    .filter(Boolean);
}

/**
 * Check if the server has deployed a newer HTML or newer JS bundles
 */
export async function probeServerAssetsUpdate(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const res = await fetch(`/?_app_sync=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!res.ok) return false;

    const html = await res.text();
    const scriptRegex = /<script\b[^>]*src="([^"]+)"[^>]*>/gi;
    const remoteScripts: string[] = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      if (match[1]) remoteScripts.push(match[1]);
    }

    if (remoteScripts.length > 0 && initialScriptHashes.length > 0) {
      // Check if any script src has changed (e.g. Vite hashes in /assets/)
      const hasDifferentScripts = remoteScripts.some(
        (rs) => rs.startsWith('/assets/') && !initialScriptHashes.includes(rs)
      );
      if (hasDifferentScripts) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Probe server assets notice:', err);
  }

  return false;
}

/**
 * Check if Firestore has a newer system version broadcast
 */
export async function checkFirestoreSystemUpdate(lastKnownTimestamp: number): Promise<{ hasUpdate: boolean; timestamp: number; notes?: string }> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'system_version'));
    if (snap.exists()) {
      const data = snap.data();
      const remoteTime = Number(data.timestamp) || 0;
      if (remoteTime > lastKnownTimestamp) {
        return { hasUpdate: true, timestamp: remoteTime, notes: data.notes };
      }
      return { hasUpdate: false, timestamp: remoteTime };
    }
  } catch (err) {
    console.warn('Firestore version check notice:', err);
  }
  return { hasUpdate: false, timestamp: lastKnownTimestamp };
}

/**
 * Broadcast a new system update to all active devices/students
 */
export async function broadcastSystemUpdate(notes: string = 'Pembaruan sistem ujian'): Promise<void> {
  const newTimestamp = Date.now();
  try {
    await setDoc(doc(db, 'settings', 'system_version'), {
      version: LOCAL_APP_VERSION,
      timestamp: newTimestamp,
      notes,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    // Save locally
    try {
      localStorage.setItem('exam_edu_last_known_version_time', String(newTimestamp));
    } catch (e) {}
  } catch (err) {
    console.error('Failed to broadcast system update:', err);
    throw err;
  }
}

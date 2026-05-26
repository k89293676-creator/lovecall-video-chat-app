import { useState, useCallback } from 'react';

export type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';

export function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Chrome/') && !ua.includes('Chromium/')) return 'chrome';
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'safari';
  return 'other';
}

export const BROWSER_INSTRUCTIONS: Record<BrowserType, { title: string; steps: string[] }> = {
  chrome: {
    title: 'Enable in Chrome',
    steps: [
      'Click the lock icon in the address bar',
      'Find "Camera" and "Microphone"',
      'Set both to "Allow"',
      'Refresh the page',
    ],
  },
  firefox: {
    title: 'Enable in Firefox',
    steps: [
      'Click the shield icon in the address bar',
      'Click "Permissions" or the camera/mic icons',
      'Set both to "Allow"',
      'Refresh the page',
    ],
  },
  safari: {
    title: 'Enable in Safari',
    steps: [
      'Go to Safari → Settings for This Website',
      'Set Camera and Microphone to "Allow"',
      'Refresh the page',
    ],
  },
  edge: {
    title: 'Enable in Edge',
    steps: [
      'Click the lock icon in the address bar',
      'Find "Camera" and "Microphone"',
      'Set both to "Allow"',
      'Refresh the page',
    ],
  },
  other: {
    title: 'Enable Permissions',
    steps: [
      'Open your browser settings',
      'Navigate to Site Permissions',
      'Allow Camera and Microphone for this site',
      'Refresh the page',
    ],
  },
};

export function usePermissions() {
  const [permissionState, setPermissionState] = useState<PermissionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const browser = detectBrowser();

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support camera/microphone access.');
        setPermissionState('error');
        return false;
      }

      const [camPermission, micPermission] = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName }),
      ]).catch(() => [null, null]);

      if (camPermission?.state === 'denied' || micPermission?.state === 'denied') {
        setPermissionState('denied');
        return false;
      }

      if (camPermission?.state === 'granted' && micPermission?.state === 'granted') {
        setPermissionState('granted');
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<MediaStream | null> => {
    setPermissionState('requesting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setPermissionState('granted');
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Camera and microphone access was denied.');
      } else if (err.name === 'NotFoundError') {
        setPermissionState('error');
        setError('No camera or microphone found on this device.');
      } else if (err.name === 'NotReadableError') {
        setPermissionState('error');
        setError('Camera or microphone is already in use by another app.');
      } else if (err.name === 'OverconstrainedError') {
        setPermissionState('error');
        setError('Camera does not meet the required specifications.');
      } else {
        setPermissionState('error');
        setError(err.message || 'An unknown error occurred.');
      }
      return null;
    }
  }, []);

  return {
    permissionState,
    error,
    browser,
    checkPermissions,
    requestPermissions,
  };
}

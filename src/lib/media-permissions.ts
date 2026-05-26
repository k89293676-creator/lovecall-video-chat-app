export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface MediaError {
  title: string;
  description: string;
  canRetry: boolean;
  browserHint?: string;
  steps?: string[];
}

export interface AcquiredMedia {
  stream: MediaStream;
  hasVideo: boolean;
  hasAudio: boolean;
}

const CONSTRAINT_SETS: MediaStreamConstraints[] = [
  { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true },
  { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true },
  { video: true, audio: true },
  { video: true, audio: false },
  { video: false, audio: true },
];

export function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/chromium/i.test(ua)) return 'Chromium';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'your browser';
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function getPermissionSteps(browser: string): string[] {
  if (isIOS()) {
    return [
      'Tap the "AA" icon (or 🔒) in the Safari address bar',
      'Tap "Website Settings"',
      'Set Camera → Allow and Microphone → Allow',
      'Tap Done, then tap Try Again below',
    ];
  }
  switch (browser) {
    case 'Chrome':
    case 'Chromium':
    case 'Edge':
      return [
        'Click the 🔒 lock icon in your address bar',
        'Set Camera → Allow and Microphone → Allow',
        'Click Try Again below',
      ];
    case 'Firefox':
      return [
        'Click the camera 🎥 icon in the address bar',
        'Click "Remove blocked permissions"',
        'Click Try Again below',
      ];
    case 'Safari':
      return [
        'Open Safari → Settings → Websites',
        'Tap Camera → set this site to Allow',
        'Tap Microphone → set this site to Allow',
        'Come back and tap Try Again',
      ];
    default:
      return [
        'Open your browser settings',
        'Find Camera and Microphone permissions',
        'Allow access for this site',
        'Click Try Again below',
      ];
  }
}

export function classifyError(err: unknown): MediaError {
  const browser = getBrowserName();
  if (!(err instanceof Error)) {
    return { title: 'Unknown Error', description: 'An unexpected error occurred.', canRetry: true };
  }
  const name = (err as DOMException).name ?? err.name;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        title: 'Access Denied',
        description: isIOS()
          ? 'Camera or microphone access was blocked. Follow the steps below to allow access in Safari, then tap Try Again.'
          : 'Camera or microphone access was blocked. Follow the steps below to allow access, then click Try Again.',
        canRetry: true,
        steps: getPermissionSteps(browser),
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        title: 'No Device Found',
        description: 'No camera or microphone was detected on this device. Connect a device and try again.',
        canRetry: true,
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'Device Busy',
        description: 'Your camera or microphone is being used by another app. Close other video apps (Zoom, Teams, FaceTime) and try again.',
        canRetry: true,
      };
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return {
        title: 'Camera Not Supported',
        description: 'Your camera does not support the requested resolution. Trying lower quality…',
        canRetry: true,
      };
    case 'SecurityError':
      return {
        title: 'Insecure Connection',
        description: 'Camera access requires HTTPS. Please open this app over a secure (https://) connection.',
        canRetry: false,
      };
    case 'AbortError':
      return {
        title: 'Access Interrupted',
        description: 'Camera access was interrupted. Please try again.',
        canRetry: true,
      };
    default:
      return {
        title: 'Camera Error',
        description: err.message || 'Could not access camera or microphone.',
        canRetry: true,
      };
  }
}

export async function getUserMediaSafe(): Promise<AcquiredMedia> {
  let lastError: unknown;
  for (const constraints of CONSTRAINT_SETS) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return {
        stream,
        hasVideo: stream.getVideoTracks().length > 0,
        hasAudio: stream.getAudioTracks().length > 0,
      };
    } catch (err) {
      lastError = err;
      const info = classifyError(err);
      if (!info.canRetry) throw err;
    }
  }
  throw lastError;
}

export async function getUserMediaWithDevices(
  videoDeviceId?: string,
  audioDeviceId?: string,
): Promise<AcquiredMedia> {
  const videoConstraint: MediaTrackConstraints | boolean = videoDeviceId
    ? { deviceId: { exact: videoDeviceId } }
    : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };
  const audioConstraint: MediaTrackConstraints | boolean = audioDeviceId
    ? { deviceId: { exact: audioDeviceId } }
    : true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraint,
      audio: audioConstraint,
    });
    return {
      stream,
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0,
    };
  } catch {
    return getUserMediaSafe();
  }
}

export interface DeviceList {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}

export async function enumerateDevices(): Promise<DeviceList> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: devices.filter(d => d.kind === 'videoinput'),
      microphones: devices.filter(d => d.kind === 'audioinput'),
    };
  } catch {
    return { cameras: [], microphones: [] };
  }
}

export async function queryPermission(name: 'camera' | 'microphone'): Promise<PermissionStatus> {
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state as PermissionStatus;
  } catch {
    return 'unsupported';
  }
}

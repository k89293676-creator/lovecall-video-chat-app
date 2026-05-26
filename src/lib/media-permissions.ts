export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface MediaError {
  title: string;
  description: string;
  canRetry: boolean;
  browserHint?: string;
}

export interface AcquiredMedia {
  stream: MediaStream;
  hasVideo: boolean;
  hasAudio: boolean;
}

// Ordered fallback constraint sets — widest to narrowest
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

export function getPermissionBrowserHint(browser: string): string {
  switch (browser) {
    case 'Chrome':
    case 'Chromium':
    case 'Edge':
      return 'Click the camera/lock icon in the address bar → Allow camera and microphone → Reload.';
    case 'Firefox':
      return 'Click the camera icon in the address bar → Remove blocked permission → Reload.';
    case 'Safari':
      return 'Go to Safari → Settings → Websites → Camera (and Microphone) → set this site to Allow.';
    default:
      return 'Check your browser settings to allow camera and microphone access, then reload.';
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
        description: 'Camera and microphone access was blocked by the browser.',
        canRetry: false,
        browserHint: getPermissionBrowserHint(browser),
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        title: 'No Device Found',
        description: 'No camera or microphone was detected on this device.',
        canRetry: true,
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'Device Busy',
        description: 'Your camera or microphone is being used by another application (e.g. Zoom, Teams). Close other video apps and try again.',
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
        description: 'Camera access requires HTTPS. Please open this app over a secure connection.',
        canRetry: false,
      };
    case 'AbortError':
      return {
        title: 'Access Aborted',
        description: 'Camera/microphone access was interrupted. Please try again.',
        canRetry: true,
      };
    case 'TypeError':
      return {
        title: 'Configuration Error',
        description: 'Invalid media constraints. Please try again.',
        canRetry: true,
      };
    default:
      return {
        title: 'Media Error',
        description: err.message || 'Could not access camera or microphone.',
        canRetry: true,
      };
  }
}

/** Try multiple constraint sets from widest to narrowest until one works. */
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
      // If denied or security error, stop immediately — retrying won't help
      if (!info.canRetry) throw err;
    }
  }
  throw lastError;
}

/** Re-acquire media with a specific deviceId (for device switching). */
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

  const constraints: MediaStreamConstraints = {
    video: videoConstraint,
    audio: audioConstraint,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return {
      stream,
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0,
    };
  } catch {
    // Fall back to default
    return getUserMediaSafe();
  }
}

export interface DeviceList {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}

/** Enumerate available devices. Returns labelled lists only after permission is granted. */
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

/** Check permission state without triggering a prompt. Returns 'unsupported' in Safari < 16. */
export async function queryPermission(name: 'camera' | 'microphone'): Promise<PermissionStatus> {
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state as PermissionStatus;
  } catch {
    return 'unsupported';
  }
}

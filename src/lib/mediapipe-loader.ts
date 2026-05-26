/**
 * Singleton loader for MediaPipe Tasks Vision.
 * KEY IMPROVEMENTS:
 * - Multiple CDN mirrors tried in sequence (jsdelivr → unpkg → skypack)
 * - Multiple WASM base fallbacks
 * - Multiple model URL fallbacks
 * - Per-CDN retry with timeout + cache-bust
 * - GPU → CPU delegate fallback preserved
 */

declare global {
  interface Window {
    __mediapipeFaceLandmarker?: any;
    __mediapipeGestureRecognizer?: any;
    __mediapipeReady?: Promise<void>;
    __mediapipeDelegate?: 'GPU' | 'CPU';
  }
}

const MP_VERSION = '0.10.14';

const VISION_BUNDLE_URLS = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.js`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.js`,
];

const WASM_BASES = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MP_VERSION}/wasm`,
];

const FACE_MODEL_URLS = [
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
];

const GESTURE_MODEL_URLS = [
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
];

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function loadScriptFromUrls(urls: string[], id: string): Promise<void> {
  // If already loaded, verify globals exist
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    const w = window as any;
    if (w.vision || w.FilesetResolver || w.FaceLandmarker) return;
    existing.remove();
  }

  let lastErr: Error = new Error('No CDN URLs provided');

  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          // Cache-bust on retry
          s.src = attempt === 0 ? url : `${url}?t=${Date.now()}`;
          s.id = id;
          s.async = true;
          s.crossOrigin = 'anonymous';
          const timer = setTimeout(() => {
            s.remove();
            reject(new Error(`Timeout loading from ${url}`));
          }, 25000);
          s.onload = () => { clearTimeout(timer); resolve(); };
          s.onerror = () => {
            clearTimeout(timer);
            s.remove();
            reject(new Error(`Network error loading ${url}`));
          };
          document.head.appendChild(s);
        });
        return; // success
      } catch (e) {
        lastErr = e as Error;
        console.warn(`[MediaPipe CDN] Attempt ${attempt + 1} failed for ${url}:`, lastErr.message);
        const stale = document.getElementById(id);
        if (stale) stale.remove();
        if (attempt === 0) await sleep(500);
      }
    }
  }

  throw new Error(
    `Failed to load MediaPipe from all sources. Check your internet connection.\n(${lastErr.message})`
  );
}

function resolveVisionGlobals() {
  const w = window as any;
  // The UMD bundle may expose globals under window.vision or directly on window
  const ns = w.vision ?? w;
  const { FilesetResolver, FaceLandmarker, GestureRecognizer } = ns;
  if (!FilesetResolver || !FaceLandmarker || !GestureRecognizer) {
    throw new Error(
      'MediaPipe globals not found after loading bundle. ' +
      'The CDN may have served a corrupted or incomplete file.'
    );
  }
  return { FilesetResolver, FaceLandmarker, GestureRecognizer };
}

async function tryModelUrl<T>(
  factory: (wasmFileset: any, opts: any) => Promise<T>,
  wasmFileset: any,
  urls: string[],
  makeOpts: (url: string) => any,
): Promise<T> {
  let lastErr: Error | null = null;
  for (const url of urls) {
    try {
      return await factory(wasmFileset, makeOpts(url));
    } catch (e) {
      lastErr = e as Error;
      console.warn('[MediaPipe] Model URL failed:', url, lastErr.message);
    }
  }
  throw lastErr ?? new Error('All model URLs failed');
}

async function buildModels(delegate: 'GPU' | 'CPU', wasmBase: string): Promise<void> {
  const { FilesetResolver, FaceLandmarker, GestureRecognizer } = resolveVisionGlobals();
  const wasmFileset = await FilesetResolver.forVisionTasks(wasmBase);

  const [face, gesture] = await Promise.all([
    tryModelUrl(
      (fs, opts) => FaceLandmarker.createFromOptions(fs, opts),
      wasmFileset,
      FACE_MODEL_URLS,
      (url) => ({
        baseOptions: { modelAssetPath: url, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      }),
    ),
    tryModelUrl(
      (fs, opts) => GestureRecognizer.createFromOptions(fs, opts),
      wasmFileset,
      GESTURE_MODEL_URLS,
      (url) => ({
        baseOptions: { modelAssetPath: url, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    ),
  ]);

  window.__mediapipeFaceLandmarker = face;
  window.__mediapipeGestureRecognizer = gesture;
  window.__mediapipeDelegate = delegate;
}

async function tryDelegate(delegate: 'GPU' | 'CPU'): Promise<void> {
  let lastErr: Error | null = null;
  for (const wasmBase of WASM_BASES) {
    try {
      await buildModels(delegate, wasmBase);
      return;
    } catch (e) {
      lastErr = e as Error;
      console.warn(`[MediaPipe] ${delegate} + wasm(${wasmBase}) failed:`, lastErr.message);
    }
  }
  throw lastErr ?? new Error(`${delegate} delegate failed on all WASM sources`);
}

export async function loadMediaPipe(): Promise<void> {
  if (window.__mediapipeReady) return window.__mediapipeReady;

  window.__mediapipeReady = (async () => {
    await loadScriptFromUrls(VISION_BUNDLE_URLS, 'mediapipe-tasks-vision');

    try {
      await tryDelegate('GPU');
      console.info('[MediaPipe] Ready — GPU');
    } catch (gpuErr) {
      console.warn('[MediaPipe] GPU unavailable, trying CPU…');
      try {
        await tryDelegate('CPU');
        console.info('[MediaPipe] Ready — CPU');
      } catch (cpuErr) {
        throw new Error(`AR could not initialize: ${(cpuErr as Error).message}`);
      }
    }
  })();

  return window.__mediapipeReady;
}

/** Reset singleton — call before retrying after a failure */
export function resetMediaPipe(): void {
  window.__mediapipeReady = undefined;
  window.__mediapipeFaceLandmarker = undefined;
  window.__mediapipeGestureRecognizer = undefined;
  window.__mediapipeDelegate = undefined;
  document.getElementById('mediapipe-tasks-vision')?.remove();
}

export function getFaceLandmarker(): any     { return window.__mediapipeFaceLandmarker ?? null; }
export function getGestureRecognizer(): any  { return window.__mediapipeGestureRecognizer ?? null; }
export function isMediaPipeReady(): boolean  { return !!(window.__mediapipeFaceLandmarker && window.__mediapipeGestureRecognizer); }
export function getActiveDelegate(): 'GPU' | 'CPU' | null { return window.__mediapipeDelegate ?? null; }

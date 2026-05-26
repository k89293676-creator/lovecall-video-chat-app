/**
 * Singleton loader for MediaPipe Tasks Vision (CDN UMD bundle).
 * GPU → CPU fallback, progress callbacks, reset support.
 */

declare global {
  interface Window {
    __mediapipeFaceLandmarker?: any;
    __mediapipeGestureRecognizer?: any;
    __mediapipeReady?: Promise<void>;
    __mediapipeDelegate?: 'GPU' | 'CPU';
  }
}

const VISION_BUNDLE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js';

const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const GESTURE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.id = id; s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('Failed to load MediaPipe bundle from CDN. Check your internet connection.'));
    document.head.appendChild(s);
  });
}

async function buildModels(delegate: 'GPU' | 'CPU'): Promise<void> {
  const vision = (window as any).vision ?? (window as any);
  const { FilesetResolver, FaceLandmarker, GestureRecognizer } = vision;

  if (!FilesetResolver || !FaceLandmarker || !GestureRecognizer) {
    throw new Error('MediaPipe Tasks Vision globals not found — bundle may be corrupted.');
  }

  const wasmFileset = await FilesetResolver.forVisionTasks(WASM_BASE);

  const [face, gesture] = await Promise.all([
    FaceLandmarker.createFromOptions(wasmFileset, {
      baseOptions:  { modelAssetPath: FACE_MODEL, delegate },
      runningMode:  'VIDEO',
      numFaces:     1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    }),
    GestureRecognizer.createFromOptions(wasmFileset, {
      baseOptions:  { modelAssetPath: GESTURE_MODEL, delegate },
      runningMode:  'VIDEO',
      numHands:     2,
    }),
  ]);

  window.__mediapipeFaceLandmarker  = face;
  window.__mediapipeGestureRecognizer = gesture;
  window.__mediapipeDelegate = delegate;
}

export async function loadMediaPipe(): Promise<void> {
  if (window.__mediapipeReady) return window.__mediapipeReady;

  window.__mediapipeReady = (async () => {
    await loadScript(VISION_BUNDLE_URL, 'mediapipe-tasks-vision');

    try {
      await buildModels('GPU');
      console.info('[MediaPipe] Loaded with GPU delegate');
    } catch (gpuErr) {
      console.warn('[MediaPipe] GPU failed, retrying CPU:', (gpuErr as Error).message);
      try {
        await buildModels('CPU');
        console.info('[MediaPipe] Loaded with CPU delegate');
      } catch (cpuErr) {
        throw new Error(`MediaPipe failed to initialize: ${(cpuErr as Error).message}`);
      }
    }
  })();

  return window.__mediapipeReady;
}

/** Reset singleton so it can be re-initialized (useful after permission changes) */
export function resetMediaPipe(): void {
  window.__mediapipeReady = undefined;
  window.__mediapipeFaceLandmarker = undefined;
  window.__mediapipeGestureRecognizer = undefined;
}

export function getFaceLandmarker():     any { return window.__mediapipeFaceLandmarker    ?? null; }
export function getGestureRecognizer(): any { return window.__mediapipeGestureRecognizer ?? null; }
export function isMediaPipeReady():   boolean { return !!(window.__mediapipeFaceLandmarker && window.__mediapipeGestureRecognizer); }
export function getActiveDelegate(): 'GPU' | 'CPU' | null { return window.__mediapipeDelegate ?? null; }

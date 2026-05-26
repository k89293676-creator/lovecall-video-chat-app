import { useEffect, useRef, useState } from 'react';
import { loadMediaPipe, getFaceLandmarker, getGestureRecognizer, getActiveDelegate } from '@/lib/mediapipe-loader';
import { detectGesture, type GestureName } from '@/hooks/use-gestures';

export interface FaceLandmark { x: number; y: number; z: number }
export interface HandLandmark { x: number; y: number; z: number }

export interface HeadPose {
  tiltAngle: number;
  nodAngle:  number;
  yawAngle:  number;
}

export interface FaceExpression {
  mouthOpen:      boolean;
  mouthOpenRatio: number;
  eyeBlinkLeft:   boolean;
  eyeBlinkRight:  boolean;
  smiling:        boolean;
  eyeBrowsRaised: boolean;
  eyeGazeLeft:    boolean;
  eyeGazeRight:   boolean;
}

export interface ARData {
  faceLandmarks:      FaceLandmark[]   | null;
  handLandmarks:      HandLandmark[][] | null;
  recognizedGestures: string[];
  headPose:           HeadPose         | null;
  faceExpression:     FaceExpression   | null;
}

export interface ARState extends ARData {
  isLoading:       boolean;
  isReady:         boolean;
  error:           string | null;
  loadingProgress: number;
}

interface UseAROptions {
  videoRef:        React.RefObject<HTMLVideoElement>;
  enabled:         boolean;
  onGesture?:      (gesture: GestureName) => void;
  onHeadTilt?:     (angle: number) => void;
  onMouthOpen?:    () => void;
  onBlink?:        (side: 'left' | 'right' | 'both') => void;
  onSmile?:        () => void;
  onEyeBrowRaise?: () => void;
}

// Face landmark indices (MediaPipe 478-point model)
const UPPER_LIP   = 13;
const LOWER_LIP   = 14;
const MOUTH_LEFT  = 61;
const MOUTH_RIGHT = 291;
const L_EYE_TOP   = 159;
const L_EYE_BOT   = 145;
const R_EYE_TOP   = 386;
const R_EYE_BOT   = 374;
const L_IRIS      = 468;
const R_IRIS      = 473;
const L_EYE_OUT   = 33;
const L_EYE_IN    = 133;
const R_EYE_OUT   = 263;
const R_EYE_IN    = 362;
const L_BROW      = 70;
const R_BROW      = 300;
const NOSE_BRIDGE = 6;
const CHIN        = 152;

/**
 * Adaptive EMA smoothing: faster when movement is large, slower when still.
 * This gives responsive tracking without jitter on fast moves.
 */
function adaptiveSmoothLandmarks(
  prev: FaceLandmark[] | null,
  curr: FaceLandmark[],
): FaceLandmark[] {
  if (!prev || prev.length !== curr.length) return curr;

  // Measure average movement across all points
  let totalDelta = 0;
  for (let i = 0; i < curr.length; i++) {
    const dx = curr[i].x - prev[i].x;
    const dy = curr[i].y - prev[i].y;
    totalDelta += Math.sqrt(dx * dx + dy * dy);
  }
  const avgDelta = totalDelta / curr.length;

  // Adaptive alpha: more weight to current frame when moving fast
  // Range: 0.15 (very still) → 0.55 (fast movement)
  const alpha = Math.min(0.55, 0.15 + avgDelta * 80);

  return curr.map((lm, i) => ({
    x: prev[i].x + alpha * (lm.x - prev[i].x),
    y: prev[i].y + alpha * (lm.y - prev[i].y),
    z: prev[i].z + alpha * (lm.z - prev[i].z),
  }));
}

function computeHeadPose(lm: FaceLandmark[]): HeadPose {
  const le   = lm[L_EYE_OUT];
  const re   = lm[R_EYE_OUT];
  const nose = lm[NOSE_BRIDGE];
  const chin = lm[CHIN];
  if (!le || !re || !nose || !chin) return { tiltAngle: 0, nodAngle: 0, yawAngle: 0 };

  const tiltAngle = Math.atan2(re.y - le.y, re.x - le.x) * (180 / Math.PI);

  const eyeMidY = (le.y + re.y) / 2;
  const faceH   = Math.abs(chin.y - eyeMidY);
  const nodAngle = faceH > 0 ? ((nose.y - eyeMidY) / faceH - 0.35) * 60 : 0;

  const eyeW          = Math.abs(re.x - le.x);
  const noseOffCenter = (nose.x - (le.x + re.x) / 2) / (eyeW + 0.001);
  const yawAngle      = noseOffCenter * 80;

  return { tiltAngle, nodAngle, yawAngle };
}

function computeFaceExpression(lm: FaceLandmark[]): FaceExpression {
  const mouthH = lm[UPPER_LIP] && lm[LOWER_LIP]
    ? Math.abs(lm[LOWER_LIP].y - lm[UPPER_LIP].y) : 0;
  const mouthW = lm[MOUTH_LEFT] && lm[MOUTH_RIGHT]
    ? Math.abs(lm[MOUTH_RIGHT].x - lm[MOUTH_LEFT].x) : 0.1;
  const mouthOpenRatio = Math.min(1, mouthH / (mouthW * 0.6));
  const mouthOpen = mouthOpenRatio > 0.3; // lowered from 0.35 for better detection

  const leftEyeH  = lm[L_EYE_TOP] && lm[L_EYE_BOT]
    ? Math.abs(lm[L_EYE_BOT].y - lm[L_EYE_TOP].y) : 0.03;
  const rightEyeH = lm[R_EYE_TOP] && lm[R_EYE_BOT]
    ? Math.abs(lm[R_EYE_BOT].y - lm[R_EYE_TOP].y) : 0.03;
  const eyeBlinkLeft  = leftEyeH  < 0.016; // slightly relaxed from 0.014
  const eyeBlinkRight = rightEyeH < 0.016;

  let smiling = false;
  if (lm[MOUTH_LEFT] && lm[MOUTH_RIGHT] && lm[LOWER_LIP]) {
    const cornerY = (lm[MOUTH_LEFT].y + lm[MOUTH_RIGHT].y) / 2;
    smiling = cornerY < lm[LOWER_LIP].y - 0.006; // more sensitive smile
  }

  let eyeBrowsRaised = false;
  if (lm[L_BROW] && lm[R_BROW] && lm[L_EYE_TOP] && lm[R_EYE_TOP]) {
    const leftBrowDist  = lm[L_EYE_TOP].y - lm[L_BROW].y;
    const rightBrowDist = lm[R_EYE_TOP].y - lm[R_BROW].y;
    eyeBrowsRaised = (leftBrowDist + rightBrowDist) / 2 > 0.035; // more sensitive
  }

  let eyeGazeLeft = false, eyeGazeRight = false;
  if (lm[L_IRIS] && lm[R_IRIS]) {
    const irisAvgX = (lm[L_IRIS].x + lm[R_IRIS].x) / 2;
    const eyeAvgX  = (
      (lm[L_EYE_OUT].x + lm[L_EYE_IN].x) / 2 +
      (lm[R_EYE_OUT].x + lm[R_EYE_IN].x) / 2
    ) / 2;
    if (irisAvgX - eyeAvgX >  0.018) eyeGazeRight = true; // more sensitive gaze
    if (eyeAvgX  - irisAvgX > 0.018) eyeGazeLeft  = true;
  }

  return {
    mouthOpen, mouthOpenRatio,
    eyeBlinkLeft, eyeBlinkRight,
    smiling, eyeBrowsRaised,
    eyeGazeLeft, eyeGazeRight,
  };
}

const INIT_STATE: ARState = {
  faceLandmarks: null, handLandmarks: null, recognizedGestures: [],
  headPose: null, faceExpression: null,
  isLoading: false, isReady: false, error: null, loadingProgress: 0,
};

const MP_GESTURE_MAP: Record<string, GestureName> = {
  Open_Palm:   'open_palm',
  Thumb_Up:    'thumbs_up',
  Thumb_Down:  'thumbs_down',
  Victory:     'peace',
  Closed_Fist: 'fist',
  Pointing_Up: 'point',
  ILoveYou:    'rock_on',
};

// Detection rate: GPU runs faster so we can push to ~20fps; CPU stays at 12fps
const GPU_INTERVAL_MS = 50;  // ~20fps
const CPU_INTERVAL_MS = 83;  // ~12fps

export function useAR({
  videoRef,
  enabled,
  onGesture,
  onHeadTilt,
  onMouthOpen,
  onBlink,
  onSmile,
  onEyeBrowRaise,
}: UseAROptions): ARState {
  const [state, setState] = useState<ARState>(INIT_STATE);

  // Store all callbacks in refs so detection loop never restarts due to them
  const cbGesture    = useRef(onGesture);
  const cbHeadTilt   = useRef(onHeadTilt);
  const cbMouthOpen  = useRef(onMouthOpen);
  const cbBlink      = useRef(onBlink);
  const cbSmile      = useRef(onSmile);
  const cbBrowRaise  = useRef(onEyeBrowRaise);

  cbGesture.current   = onGesture;
  cbHeadTilt.current  = onHeadTilt;
  cbMouthOpen.current = onMouthOpen;
  cbBlink.current     = onBlink;
  cbSmile.current     = onSmile;
  cbBrowRaise.current = onEyeBrowRaise;

  // Detection state refs (never trigger re-renders)
  const gestureHoldRef   = useRef<{ name: GestureName; since: number } | null>(null);
  const lastTriggeredRef = useRef<GestureName>('none');
  const lastMouthOpenRef = useRef(0);
  const lastBlinkRef     = useRef(0);
  const lastSmileRef     = useRef(0);
  const lastTiltRef      = useRef(0);
  const prevTiltRef      = useRef(0);
  const lastBrowRef      = useRef(0);
  const prevFaceLmRef    = useRef<FaceLandmark[] | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Single effect — only re-runs when `enabled` changes
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setState(INIT_STATE);
      prevFaceLmRef.current = null;
      return;
    }

    let active = true;
    setState(s => ({ ...s, isLoading: true, error: null, loadingProgress: 5 }));

    const timers = [
      setTimeout(() => active && setState(s => ({ ...s, loadingProgress: 20 })), 500),
      setTimeout(() => active && setState(s => ({ ...s, loadingProgress: 45 })), 2000),
      setTimeout(() => active && setState(s => ({ ...s, loadingProgress: 70 })), 4000),
      setTimeout(() => active && setState(s => ({ ...s, loadingProgress: 88 })), 6000),
    ];

    loadMediaPipe()
      .then(() => {
        timers.forEach(clearTimeout);
        if (!active) return;
        setState(s => ({ ...s, isLoading: false, isReady: true, loadingProgress: 100 }));

        // Pick detection rate based on which delegate loaded
        const delegate = getActiveDelegate();
        const intervalMs = delegate === 'GPU' ? GPU_INTERVAL_MS : CPU_INTERVAL_MS;

        intervalRef.current = setInterval(() => {
          if (!active) return;

          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.paused) return;
          if (video.currentTime === lastVideoTimeRef.current) return;
          lastVideoTimeRef.current = video.currentTime;

          const faceLandmarker    = getFaceLandmarker();
          const gestureRecognizer = getGestureRecognizer();
          if (!faceLandmarker || !gestureRecognizer) return;

          try {
            const ts = performance.now();
            const faceRes    = faceLandmarker.detectForVideo(video, ts);
            const gestureRes = gestureRecognizer.recognizeForVideo(video, ts);

            const rawFaceLm: FaceLandmark[] | null = faceRes?.faceLandmarks?.[0] ?? null;
            const smoothedFace = rawFaceLm
              ? adaptiveSmoothLandmarks(prevFaceLmRef.current, rawFaceLm)
              : null;
            prevFaceLmRef.current = smoothedFace;

            const handLms: HandLandmark[][] | null =
              gestureRes?.landmarks?.length > 0 ? gestureRes.landmarks : null;
            const mpGestures: string[] = (gestureRes?.gestures ?? []).map(
              (g: any[]) => g?.[0]?.categoryName ?? 'None',
            );

            const headPose       = smoothedFace ? computeHeadPose(smoothedFace)       : null;
            const faceExpression = smoothedFace ? computeFaceExpression(smoothedFace) : null;

            setState(s => ({
              ...s,
              faceLandmarks:      smoothedFace,
              handLandmarks:      handLms,
              recognizedGestures: mpGestures,
              headPose,
              faceExpression,
            }));

            if (handLms?.length) {
              processGestureInline(handLms[0], mpGestures[0] ?? 'None');
            } else {
              gestureHoldRef.current = null;
            }

            if (headPose && faceExpression) {
              processFaceEventsInline(faceExpression, headPose);
            }

          } catch { /* skip bad frame */ }
        }, intervalMs);
      })
      .catch(err => {
        timers.forEach(clearTimeout);
        if (!active) return;
        setState(s => ({
          ...s,
          isLoading: false,
          isReady: false,
          error: String(err?.message ?? 'Failed to load AR'),
          loadingProgress: 0,
        }));
      });

    return () => {
      active = false;
      timers.forEach(clearTimeout);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [enabled]);

  // Gesture processing — uses refs to avoid recreating interval
  function processGestureInline(landmarks: HandLandmark[], mpGestureName: string) {
    if (!cbGesture.current) return;

    let gestureName: GestureName = 'none';
    if (mpGestureName && mpGestureName !== 'None') {
      gestureName = MP_GESTURE_MAP[mpGestureName] ?? 'none';
    }
    if (gestureName === 'none') {
      const r = detectGesture(landmarks);
      if (r.confidence > 0.70) gestureName = r.name; // slightly more sensitive (was 0.72)
    }
    if (gestureName === 'none') { gestureHoldRef.current = null; return; }

    const now = Date.now();
    if (!gestureHoldRef.current || gestureHoldRef.current.name !== gestureName) {
      gestureHoldRef.current = { name: gestureName, since: now };
      return;
    }
    // Reduced hold time: 400ms (was 550ms) for faster gesture response
    if (
      now - gestureHoldRef.current.since > 400 &&
      lastTriggeredRef.current !== gestureName
    ) {
      lastTriggeredRef.current = gestureName;
      cbGesture.current(gestureName);
      setTimeout(() => { lastTriggeredRef.current = 'none'; }, 1400);
    }
  }

  function processFaceEventsInline(expr: FaceExpression, pose: HeadPose) {
    const now = Date.now();
    if (expr.mouthOpen && now - lastMouthOpenRef.current > 2500) {
      lastMouthOpenRef.current = now;
      cbMouthOpen.current?.();
    }
    if ((expr.eyeBlinkLeft || expr.eyeBlinkRight) && now - lastBlinkRef.current > 1200) {
      lastBlinkRef.current = now;
      cbBlink.current?.(
        expr.eyeBlinkLeft && expr.eyeBlinkRight ? 'both'
          : expr.eyeBlinkLeft ? 'left' : 'right',
      );
    }
    if (expr.smiling && now - lastSmileRef.current > 3500) {
      lastSmileRef.current = now;
      cbSmile.current?.();
    }
    if (expr.eyeBrowsRaised && now - lastBrowRef.current > 2500) {
      lastBrowRef.current = now;
      cbBrowRaise.current?.();
    }
    if (
      Math.abs(pose.tiltAngle) > 14 && // slightly more sensitive (was 16)
      now - lastTiltRef.current > 2000 &&
      (
        Math.sign(pose.tiltAngle) !== Math.sign(prevTiltRef.current) ||
        Math.abs(pose.tiltAngle - prevTiltRef.current) > 8
      )
    ) {
      lastTiltRef.current = now;
      prevTiltRef.current = pose.tiltAngle;
      cbHeadTilt.current?.(pose.tiltAngle);
    } else if (Math.abs(pose.tiltAngle) <= 14) {
      prevTiltRef.current = pose.tiltAngle;
    }
  }

  return state;
}

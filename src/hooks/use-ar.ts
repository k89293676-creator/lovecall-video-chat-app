import { useEffect, useRef, useState, useCallback } from 'react';
import { loadMediaPipe, getFaceLandmarker, getGestureRecognizer } from '@/lib/mediapipe-loader';
import { detectGesture, type GestureName } from '@/hooks/use-gestures';

export interface FaceLandmark { x: number; y: number; z: number }
export interface HandLandmark { x: number; y: number; z: number }

// Head pose derived from landmarks
export interface HeadPose {
  tiltAngle: number;    // degrees, positive = tilt right
  nodAngle: number;     // pitch — positive = chin down
  yawAngle: number;     // yaw — positive = facing right
}

// Facial expressions from landmarks
export interface FaceExpression {
  mouthOpen: boolean;
  mouthOpenRatio: number;  // 0-1
  eyeBlinkLeft: boolean;
  eyeBlinkRight: boolean;
  smiling: boolean;
  eyeBrowsRaised: boolean;
  eyeGazeLeft: boolean;
  eyeGazeRight: boolean;
}

export interface ARData {
  faceLandmarks: FaceLandmark[] | null;
  handLandmarks: HandLandmark[][] | null;
  recognizedGestures: string[];
  headPose: HeadPose | null;
  faceExpression: FaceExpression | null;
}

export interface ARState extends ARData {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  loadingProgress: number; // 0-100
}

interface UseAROptions {
  videoElement: HTMLVideoElement | null;
  enabled: boolean;
  onGesture?: (gesture: GestureName) => void;
  onHeadTilt?: (angle: number) => void;
  onMouthOpen?: () => void;
  onBlink?: (side: 'left' | 'right' | 'both') => void;
  onSmile?: () => void;
  onEyeBrowRaise?: () => void;
}

// Face landmark indices
const UPPER_LIP_CENTER = 13;
const LOWER_LIP_CENTER = 14;
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_INNER = 362;
const LEFT_EYEBROW = 70;
const RIGHT_EYEBROW = 300;
const NOSE_BRIDGE = 6;
const LEFT_FOREHEAD = 54;
const RIGHT_FOREHEAD = 284;

function computeHeadPose(lm: FaceLandmark[]): HeadPose {
  const le = lm[LEFT_EYE_OUTER];
  const re = lm[RIGHT_EYE_OUTER];
  const nose = lm[NOSE_BRIDGE];
  const chin = lm[152];

  if (!le || !re || !nose || !chin) return { tiltAngle: 0, nodAngle: 0, yawAngle: 0 };

  const tiltAngle = Math.atan2(re.y - le.y, re.x - le.x) * (180 / Math.PI);

  const eyeMidY = (le.y + re.y) / 2;
  const faceH = Math.abs(chin.y - eyeMidY);
  const nodAngle = faceH > 0 ? ((nose.y - eyeMidY) / faceH - 0.35) * 60 : 0;

  const eyeW = Math.abs(re.x - le.x);
  const noseOffCenter = (nose.x - (le.x + re.x) / 2) / (eyeW + 0.001);
  const yawAngle = noseOffCenter * 80;

  return { tiltAngle, nodAngle, yawAngle };
}

function computeFaceExpression(lm: FaceLandmark[]): FaceExpression {
  const mouthH = lm[UPPER_LIP_CENTER] && lm[LOWER_LIP_CENTER]
    ? Math.abs(lm[LOWER_LIP_CENTER].y - lm[UPPER_LIP_CENTER].y)
    : 0;
  const mouthW = lm[MOUTH_LEFT] && lm[MOUTH_RIGHT]
    ? Math.abs(lm[MOUTH_RIGHT].x - lm[MOUTH_LEFT].x)
    : 0.1;
  const mouthOpenRatio = Math.min(1, mouthH / (mouthW * 0.6));
  const mouthOpen = mouthOpenRatio > 0.35;

  const leftEyeH = lm[LEFT_EYE_TOP] && lm[LEFT_EYE_BOTTOM]
    ? Math.abs(lm[LEFT_EYE_BOTTOM].y - lm[LEFT_EYE_TOP].y)
    : 0.03;
  const rightEyeH = lm[RIGHT_EYE_TOP] && lm[RIGHT_EYE_BOTTOM]
    ? Math.abs(lm[RIGHT_EYE_BOTTOM].y - lm[RIGHT_EYE_TOP].y)
    : 0.03;
  const baseEyeH = 0.025;
  const eyeBlinkLeft  = leftEyeH < baseEyeH * 0.55;
  const eyeBlinkRight = rightEyeH < baseEyeH * 0.55;

  // Smile: mouth corners raised relative to center
  let smiling = false;
  if (lm[MOUTH_LEFT] && lm[MOUTH_RIGHT] && lm[LOWER_LIP_CENTER]) {
    const cornerY = (lm[MOUTH_LEFT].y + lm[MOUTH_RIGHT].y) / 2;
    smiling = cornerY < lm[LOWER_LIP_CENTER].y - 0.01;
  }

  // Eyebrow raise
  let eyeBrowsRaised = false;
  if (lm[LEFT_EYEBROW] && lm[RIGHT_EYEBROW] && lm[LEFT_EYE_TOP] && lm[RIGHT_EYE_TOP]) {
    const leftBrowDist = lm[LEFT_EYE_TOP].y - lm[LEFT_EYEBROW].y;
    const rightBrowDist = lm[RIGHT_EYE_TOP].y - lm[RIGHT_EYEBROW].y;
    eyeBrowsRaised = (leftBrowDist + rightBrowDist) / 2 > 0.04;
  }

  // Iris gaze (left/right)
  let eyeGazeLeft = false;
  let eyeGazeRight = false;
  if (lm[LEFT_IRIS_CENTER] && lm[RIGHT_IRIS_CENTER]) {
    const irisAvgX = (lm[LEFT_IRIS_CENTER].x + lm[RIGHT_IRIS_CENTER].x) / 2;
    const eyeAvgX = (
      (lm[LEFT_EYE_OUTER].x + lm[LEFT_EYE_INNER].x) / 2 +
      (lm[RIGHT_EYE_OUTER].x + lm[RIGHT_EYE_INNER].x) / 2
    ) / 2;
    if (irisAvgX - eyeAvgX > 0.025) eyeGazeRight = true;
    if (eyeAvgX - irisAvgX > 0.025) eyeGazeLeft = true;
  }

  return { mouthOpen, mouthOpenRatio, eyeBlinkLeft, eyeBlinkRight, smiling, eyeBrowsRaised, eyeGazeLeft, eyeGazeRight };
}

export function useAR({
  videoElement,
  enabled,
  onGesture,
  onHeadTilt,
  onMouthOpen,
  onBlink,
  onSmile,
  onEyeBrowRaise,
}: UseAROptions): ARState {
  const [state, setState] = useState<ARState>({
    faceLandmarks: null,
    handLandmarks: null,
    recognizedGestures: [],
    headPose: null,
    faceExpression: null,
    isLoading: false,
    isReady: false,
    error: null,
    loadingProgress: 0,
  });

  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const gestureHoldRef = useRef<{ name: GestureName; since: number } | null>(null);
  const lastTriggeredRef = useRef<GestureName>('none');

  // Debounce refs for face events
  const lastMouthOpenRef = useRef(0);
  const lastBlinkRef = useRef(0);
  const lastSmileRef = useRef(0);
  const lastTiltRef = useRef(0);
  const lastBrowRef = useRef(0);
  const prevTiltRef = useRef(0);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const processGesture = useCallback(
    (landmarks: HandLandmark[], mpGestureName: string) => {
      if (!onGesture) return;

      const MP_MAP: Record<string, GestureName> = {
        Open_Palm:   'open_palm',
        Thumb_Up:    'thumbs_up',
        Thumb_Down:  'thumbs_down',
        Victory:     'peace',
        Closed_Fist: 'fist',
        Pointing_Up: 'point',
        ILoveYou:    'rock_on',
      };

      let gestureName: GestureName = 'none';
      if (mpGestureName && mpGestureName !== 'None') {
        gestureName = MP_MAP[mpGestureName] ?? 'none';
      }
      if (gestureName === 'none') {
        const r = detectGesture(landmarks);
        if (r.confidence > 0.7) gestureName = r.name;
      }
      if (gestureName === 'none') { gestureHoldRef.current = null; return; }

      const now = Date.now();
      if (!gestureHoldRef.current || gestureHoldRef.current.name !== gestureName) {
        gestureHoldRef.current = { name: gestureName, since: now };
        return;
      }
      if (now - gestureHoldRef.current.since > 600 && lastTriggeredRef.current !== gestureName) {
        lastTriggeredRef.current = gestureName;
        onGesture(gestureName);
        setTimeout(() => { lastTriggeredRef.current = 'none'; }, 1800);
      }
    },
    [onGesture],
  );

  const processFaceEvents = useCallback((expr: FaceExpression, pose: HeadPose) => {
    const now = Date.now();

    if (expr.mouthOpen && now - lastMouthOpenRef.current > 3000) {
      lastMouthOpenRef.current = now;
      onMouthOpen?.();
    }

    if ((expr.eyeBlinkLeft || expr.eyeBlinkRight) && now - lastBlinkRef.current > 1500) {
      lastBlinkRef.current = now;
      const side = expr.eyeBlinkLeft && expr.eyeBlinkRight ? 'both' : expr.eyeBlinkLeft ? 'left' : 'right';
      onBlink?.(side);
    }

    if (expr.smiling && now - lastSmileRef.current > 4000) {
      lastSmileRef.current = now;
      onSmile?.();
    }

    if (expr.eyeBrowsRaised && now - lastBrowRef.current > 3000) {
      lastBrowRef.current = now;
      onEyeBrowRaise?.();
    }

    if (Math.abs(pose.tiltAngle) > 18 && now - lastTiltRef.current > 2500) {
      const prevTilt = prevTiltRef.current;
      // Only fire if tilt changed direction or crossed threshold freshly
      if (Math.sign(pose.tiltAngle) !== Math.sign(prevTilt) || Math.abs(pose.tiltAngle - prevTilt) > 10) {
        lastTiltRef.current = now;
        prevTiltRef.current = pose.tiltAngle;
        onHeadTilt?.(pose.tiltAngle);
      }
    } else {
      prevTiltRef.current = pose.tiltAngle;
    }
  }, [onMouthOpen, onBlink, onSmile, onEyeBrowRaise, onHeadTilt]);

  useEffect(() => {
    if (!enabled || !videoElement) {
      stopLoop();
      setState(s => ({ ...s, isReady: false, faceLandmarks: null, handLandmarks: null, recognizedGestures: [], headPose: null, faceExpression: null }));
      return;
    }

    let active = true;
    setState(s => ({ ...s, isLoading: true, error: null, loadingProgress: 5 }));

    const progressSteps = [
      setTimeout(() => active && setState(s => ({ ...s, loadingProgress: 25 })), 800),
      setTimeout(() => active && setState(s => ({ ...s, loadingProgress: 55 })), 2000),
      setTimeout(() => active && setState(s => ({ ...s, loadingProgress: 80 })), 4000),
    ];

    loadMediaPipe()
      .then(() => {
        progressSteps.forEach(clearTimeout);
        if (!active) return;
        setState(s => ({ ...s, isLoading: false, isReady: true, loadingProgress: 100 }));

        const detectFrame = () => {
          if (!active || !videoElement) return;
          const faceLandmarker = getFaceLandmarker();
          const gestureRecognizer = getGestureRecognizer();

          if (!faceLandmarker || !gestureRecognizer) {
            rafRef.current = requestAnimationFrame(detectFrame);
            return;
          }

          if (videoElement.readyState < 2 || videoElement.currentTime === lastVideoTimeRef.current) {
            rafRef.current = requestAnimationFrame(detectFrame);
            return;
          }
          lastVideoTimeRef.current = videoElement.currentTime;
          const now = performance.now();

          try {
            const faceResults    = faceLandmarker.detectForVideo(videoElement, now);
            const gestureResults = gestureRecognizer.recognizeForVideo(videoElement, now);

            const faceLm: FaceLandmark[] | null = faceResults?.faceLandmarks?.[0] ?? null;
            const handLms: HandLandmark[][] | null =
              gestureResults?.landmarks?.length > 0 ? gestureResults.landmarks : null;
            const mpGestures: string[] = gestureResults?.gestures?.map(
              (g: any[]) => g?.[0]?.categoryName ?? 'None',
            ) ?? [];

            const headPose = faceLm ? computeHeadPose(faceLm) : null;
            const faceExpression = faceLm ? computeFaceExpression(faceLm) : null;

            if (active) {
              setState(s => ({ ...s, faceLandmarks: faceLm, handLandmarks: handLms, recognizedGestures: mpGestures, headPose, faceExpression }));
              if (handLms && handLms.length > 0) processGesture(handLms[0], mpGestures[0] ?? 'None');
              else gestureHoldRef.current = null;
              if (headPose && faceExpression) processFaceEvents(faceExpression, headPose);
            }
          } catch { /* skip frame */ }

          rafRef.current = requestAnimationFrame(detectFrame);
        };
        rafRef.current = requestAnimationFrame(detectFrame);
      })
      .catch(err => {
        progressSteps.forEach(clearTimeout);
        if (!active) return;
        setState(s => ({ ...s, isLoading: false, error: err.message, isReady: false, loadingProgress: 0 }));
      });

    return () => {
      active = false;
      progressSteps.forEach(clearTimeout);
      stopLoop();
    };
  }, [enabled, videoElement, processGesture, processFaceEvents, stopLoop]);

  return state;
}

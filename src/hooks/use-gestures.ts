export type GestureName =
  | 'open_palm'
  | 'pinch'
  | 'peace'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'fist'
  | 'wave'
  | 'point'
  | 'ok_sign'
  | 'rock_on'
  | 'call_me'
  | 'spider_man'
  | 'l_shape'
  | 'heart_hand'
  | 'crossed_fingers'
  | 'none';

export interface GestureResult {
  name: GestureName;
  confidence: number;
}

export type Landmark = { x: number; y: number; z: number };

function dist2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Robust finger extension check combining:
 * - y-axis: tip above pip (standard upright hand)
 * - length ratio: tip farther from mcp than pip (works for tilted/sideways hand)
 */
function isFingerExtended(tip: Landmark, pip: Landmark, mcp: Landmark): boolean {
  const byY      = tip.y < pip.y - 0.01;
  const tipDist  = dist2D(tip, mcp);
  const pipDist  = dist2D(pip, mcp);
  const byLength = tipDist > pipDist * 1.35;
  return byY || byLength;
}

function isFingerCurled(tip: Landmark, pip: Landmark, mcp: Landmark): boolean {
  return !isFingerExtended(tip, pip, mcp);
}

function isThumbExtended(tip: Landmark, ip: Landmark, mcp: Landmark): boolean {
  // Works for both left/right hands and tilted orientations
  const byX     = Math.abs(tip.x - mcp.x) > Math.abs(ip.x - mcp.x) * 1.2;
  const tipDist  = dist2D(tip, mcp);
  const ipDist   = dist2D(ip, mcp);
  const byLength = tipDist > ipDist * 1.3;
  return byX || byLength;
}

export function detectGesture(landmarks: Landmark[]): GestureResult {
  if (!landmarks || landmarks.length < 21) return { name: 'none', confidence: 0 };

  const wrist    = landmarks[0];
  const thumbMcp = landmarks[2];
  const thumbIp  = landmarks[3];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];
  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];
  const ringMcp  = landmarks[13];
  const ringPip  = landmarks[14];
  const ringTip  = landmarks[16];
  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  const handSize = dist2D(wrist, middleMcp);
  if (handSize < 0.01) return { name: 'none', confidence: 0 };

  const thumb  = isThumbExtended(thumbTip, thumbIp, thumbMcp);
  const index  = isFingerExtended(indexTip, indexPip, indexMcp);
  const middle = isFingerExtended(middleTip, middlePip, middleMcp);
  const ring   = isFingerExtended(ringTip, ringPip, ringMcp);
  const pinky  = isFingerExtended(pinkyTip, pinkyPip, pinkyMcp);

  const thumbUp   = thumbTip.y < thumbMcp.y - handSize * 0.28;
  const thumbDown = thumbTip.y > thumbMcp.y + handSize * 0.28;

  const pinchDist  = dist2D(thumbTip, indexTip);
  const pinchRatio = pinchDist / handSize;

  const indexMiddleDist = dist2D(indexTip, middleTip);

  // ── Check from most-specific to least-specific ──

  // Open palm: ALL 5 extended
  if (index && middle && ring && pinky && thumb) {
    return { name: 'open_palm', confidence: 0.93 };
  }

  // OK sign: thumb+index pinched, other 3 extended
  if (pinchRatio < 0.28 && middle && ring && pinky) {
    return { name: 'ok_sign', confidence: 0.88 };
  }

  // Spider-man: index + pinky + thumb extended, middle + ring curled
  if (index && !middle && !ring && pinky && thumb) {
    return { name: 'spider_man', confidence: 0.85 };
  }

  // Rock on: index + pinky extended, middle+ring curled, thumb tucked
  if (index && !middle && !ring && pinky && !thumb) {
    return { name: 'rock_on', confidence: 0.87 };
  }

  // Heart hand: pinch close but all fingers curled (small round shape)
  if (!index && !middle && !ring && !pinky && pinchRatio < 0.35) {
    return { name: 'heart_hand', confidence: 0.80 };
  }

  // Call me: pinky + thumb, no other fingers
  if (!index && !middle && !ring && pinky && thumb) {
    return { name: 'call_me', confidence: 0.85 };
  }

  // L-shape: thumb + index, no others
  if (index && !middle && !ring && !pinky && thumb) {
    return { name: 'l_shape', confidence: 0.83 };
  }

  // Crossed fingers: index+middle close together, ring+pinky down
  if (index && middle && !ring && !pinky && indexMiddleDist < handSize * 0.20) {
    return { name: 'crossed_fingers', confidence: 0.81 };
  }

  // Peace: index+middle up and spread, ring+pinky down
  if (index && middle && !ring && !pinky) {
    return { name: 'peace', confidence: 0.88 };
  }

  // Thumbs up: thumb clearly up, all fingers curled
  if (thumbUp && !index && !middle && !ring && !pinky) {
    return { name: 'thumbs_up', confidence: 0.87 };
  }

  // Thumbs down: thumb clearly down, all fingers curled
  if (thumbDown && !index && !middle && !ring && !pinky) {
    return { name: 'thumbs_down', confidence: 0.85 };
  }

  // Fist: nothing extended
  if (!index && !middle && !ring && !pinky && !thumb) {
    return { name: 'fist', confidence: 0.83 };
  }

  // Pinch: thumb+index close, others curled
  if (pinchRatio < 0.24 && !middle && !ring) {
    return { name: 'pinch', confidence: 0.86 };
  }

  // Point: only index
  if (index && !middle && !ring && !pinky && !thumb) {
    return { name: 'point', confidence: 0.84 };
  }

  return { name: 'none', confidence: 0 };
}

export const GESTURE_LABELS: Record<GestureName, string> = {
  open_palm:       'Open Palm',
  pinch:           'Pinch',
  peace:           'Peace ✌️',
  thumbs_up:       'Thumbs Up',
  thumbs_down:     'Thumbs Down',
  fist:            'Fist',
  wave:            'Wave',
  point:           'Point',
  ok_sign:         'OK Sign',
  rock_on:         'Rock On',
  call_me:         'Call Me',
  spider_man:      'Spider-Man',
  l_shape:         'L-Shape',
  heart_hand:      'Heart Hand',
  crossed_fingers: 'Crossed Fingers',
  none:            '',
};

export const GESTURE_EMOJI: Record<GestureName, string> = {
  open_palm:       '✋',
  pinch:           '🤏',
  peace:           '✌️',
  thumbs_up:       '👍',
  thumbs_down:     '👎',
  fist:            '✊',
  wave:            '👋',
  point:           '☝️',
  ok_sign:         '👌',
  rock_on:         '🤘',
  call_me:         '🤙',
  spider_man:      '🕷️',
  l_shape:         '👈',
  heart_hand:      '🫶',
  crossed_fingers: '🤞',
  none:            '',
};

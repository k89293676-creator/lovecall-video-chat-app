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

function isFingerExtended(tip: Landmark, pip: Landmark, mcp: Landmark): boolean {
  return tip.y < pip.y && pip.y < mcp.y;
}

function isFingerCurled(tip: Landmark, pip: Landmark): boolean {
  return tip.y > pip.y;
}

function isThumbExtendedRight(tip: Landmark, ip: Landmark, mcp: Landmark): boolean {
  return tip.x > ip.x && ip.x > mcp.x;
}

function isThumbExtendedLeft(tip: Landmark, ip: Landmark, mcp: Landmark): boolean {
  return tip.x < ip.x && ip.x < mcp.x;
}

function isThumbExtended(tip: Landmark, ip: Landmark, mcp: Landmark): boolean {
  return isThumbExtendedRight(tip, ip, mcp) || isThumbExtendedLeft(tip, ip, mcp);
}

export function detectGesture(landmarks: Landmark[]): GestureResult {
  if (!landmarks || landmarks.length < 21) return { name: 'none', confidence: 0 };

  const wrist       = landmarks[0];
  const thumbCmc    = landmarks[1];
  const thumbMcp    = landmarks[2];
  const thumbIp     = landmarks[3];
  const thumbTip    = landmarks[4];
  const indexMcp    = landmarks[5];
  const indexPip    = landmarks[6];
  const indexDip    = landmarks[7];
  const indexTip    = landmarks[8];
  const middleMcp   = landmarks[9];
  const middlePip   = landmarks[10];
  const middleDip   = landmarks[11];
  const middleTip   = landmarks[12];
  const ringMcp     = landmarks[13];
  const ringPip     = landmarks[14];
  const ringDip     = landmarks[15];
  const ringTip     = landmarks[16];
  const pinkyMcp    = landmarks[17];
  const pinkyPip    = landmarks[18];
  const pinkyDip    = landmarks[19];
  const pinkyTip    = landmarks[20];

  const handSize = dist2D(wrist, middleMcp);
  if (handSize < 0.01) return { name: 'none', confidence: 0 };

  const thumb  = isThumbExtended(thumbTip, thumbIp, thumbMcp);
  const index  = isFingerExtended(indexTip, indexPip, indexMcp);
  const middle = isFingerExtended(middleTip, middlePip, middleMcp);
  const ring   = isFingerExtended(ringTip, ringPip, ringMcp);
  const pinky  = isFingerExtended(pinkyTip, pinkyPip, pinkyMcp);

  const thumbUp = thumbTip.y < thumbMcp.y - handSize * 0.3;
  const thumbDown = thumbTip.y > thumbMcp.y + handSize * 0.3;

  const pinchDist  = dist2D(thumbTip, indexTip);
  const pinchRatio = pinchDist / handSize;

  // ── OK sign: thumb + index form circle, other 3 extended ──
  if (pinchRatio < 0.28 && middle && ring && pinky) {
    return { name: 'ok_sign', confidence: 0.87 };
  }

  // ── Open palm: all 5 ──
  if (index && middle && ring && pinky && thumb) {
    return { name: 'open_palm', confidence: 0.92 };
  }

  // ── Pinch: thumb+index close, middle/ring/pinky curled ──
  if (pinchRatio < 0.22 && !middle && !ring) {
    return { name: 'pinch', confidence: 0.88 };
  }

  // ── Peace: index+middle up, ring/pinky down ──
  if (index && middle && !ring && !pinky) {
    return { name: 'peace', confidence: 0.88 };
  }

  // ── Rock on: index+pinky, middle+ring curled ──
  if (index && !middle && !ring && pinky) {
    return { name: 'rock_on', confidence: 0.86 };
  }

  // ── Call me: pinky+thumb extended, index/middle/ring curled ──
  if (!index && !middle && !ring && pinky && thumb) {
    return { name: 'call_me', confidence: 0.84 };
  }

  // ── L-shape: thumb out, index up, other 3 curled ──
  if (index && !middle && !ring && !pinky && thumb) {
    return { name: 'l_shape', confidence: 0.83 };
  }

  // ── Spider-man: index + pinky + thumb extended, middle + ring curled ──
  if (index && !middle && !ring && pinky && thumb) {
    return { name: 'spider_man', confidence: 0.82 };
  }

  // ── Crossed fingers: index+middle close in X pattern ──
  const indexMiddleDist = dist2D(indexTip, middleTip);
  if (index && middle && !ring && !pinky && indexMiddleDist < handSize * 0.18) {
    return { name: 'crossed_fingers', confidence: 0.80 };
  }

  // ── Heart hand: thumb+index curled toward each other at top of palm ──
  const thumbIndexMidDist = dist2D(
    { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2, z: 0 },
    { x: wrist.x, y: wrist.y, z: 0 }
  );
  if (!index && !middle && !ring && !pinky && pinchRatio < 0.35 && thumbIndexMidDist > handSize * 0.6) {
    return { name: 'heart_hand', confidence: 0.79 };
  }

  // ── Thumbs up: only thumb up, all fingers curled ──
  if (thumbUp && !index && !middle && !ring && !pinky) {
    return { name: 'thumbs_up', confidence: 0.86 };
  }

  // ── Thumbs down: thumb pointing down ──
  if (thumbDown && !index && !middle && !ring && !pinky) {
    return { name: 'thumbs_down', confidence: 0.84 };
  }

  // ── Fist: nothing extended ──
  if (!index && !middle && !ring && !pinky && !thumb) {
    return { name: 'fist', confidence: 0.82 };
  }

  // ── Point: only index extended ──
  if (index && !middle && !ring && !pinky && !thumb) {
    return { name: 'point', confidence: 0.84 };
  }

  return { name: 'none', confidence: 0 };
}

export const GESTURE_LABELS: Record<GestureName, string> = {
  open_palm:       'Open Palm',
  pinch:           'Pinch',
  peace:           'Peace',
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

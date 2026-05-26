/**
 * Motion-based gesture detector (pixel-diff analysis on live video).
 * IMPROVEMENTS:
 * - Faster wave detection (reduced window from 700ms to 500ms, min reversals stays at 1)
 * - More sensitive stillness detection
 * - Better circle detection (requires less travel)
 * - Double burst gap widened for easier triggering
 * - Analysis rate increased from 90ms to 70ms (~14fps)
 */

export type GestureType = 'wave' | 'bigmove' | 'stillness_break' | 'circle' | 'double_burst';

export interface MotionData {
  hasMotion: boolean;
  cx: number;
  cy: number;
  area: number;
}

export interface GestureEvent {
  type: GestureType;
  cx: number;
  cy: number;
  timestamp: number;
}

interface CentroidRecord {
  cx: number;
  cy: number;
  area: number;
  t: number;
}

const MOTION_THRESHOLD = 24;       // lower = more sensitive (was 28)
const SAMPLE_INTERVAL_MS = 70;     // faster analysis rate (was 90)
const HISTORY_SIZE = 22;           // slightly more history
const STILLNESS_MS = 1200;         // faster stillness detection (was 1500)
const WAVE_WINDOW_MS = 500;        // tighter window = more natural wave (was 700)
const WAVE_MIN_TRAVEL = 0.22;      // less travel required (was 0.28)
const BIG_AREA = 0.16;             // slightly lower (was 0.18)
const DOUBLE_BURST_GAP_MS = 750;   // wider gap (was 600) — easier to trigger

export class GestureDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private prevFrame: ImageData | null = null;
  private history: CentroidRecord[] = [];
  private lastMotionTime = 0;
  private wasStill = true;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastBurstTime = 0;
  private onGesture: (e: GestureEvent) => void;
  private onMotion: (m: MotionData) => void;
  private W = 160;
  private H = 90;

  constructor(
    onGesture: (e: GestureEvent) => void,
    onMotion: (m: MotionData) => void,
  ) {
    this.onGesture = onGesture;
    this.onMotion = onMotion;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  start(video: HTMLVideoElement) {
    this.stop(); // ensure no duplicate intervals
    this.intervalId = setInterval(() => this.analyze(video), SAMPLE_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.prevFrame = null;
    this.history = [];
    this.lastBurstTime = 0;
    this.wasStill = true;
  }

  private analyze(video: HTMLVideoElement) {
    if (video.readyState < 2 || video.paused) return;
    this.ctx.drawImage(video, 0, 0, this.W, this.H);
    const curr = this.ctx.getImageData(0, 0, this.W, this.H);
    if (!this.prevFrame) { this.prevFrame = curr; return; }

    const motion = this.computeMotion(this.prevFrame, curr);
    this.prevFrame = curr;
    this.onMotion(motion);

    const now = Date.now();

    if (motion.hasMotion && motion.area > 0.03) { // more sensitive (was 0.04)
      const wasStillBefore = this.wasStill;
      this.lastMotionTime = now;
      this.wasStill = false;

      const rec: CentroidRecord = { cx: motion.cx, cy: motion.cy, area: motion.area, t: now };
      this.history.push(rec);
      if (this.history.length > HISTORY_SIZE) this.history.shift();

      // Stillness break — immediate feedback on motion start
      if (wasStillBefore && motion.area > 0.05) {
        this.onGesture({ type: 'stillness_break', cx: motion.cx, cy: motion.cy, timestamp: now });
      }

      // Big move — sustained large motion
      if (motion.area >= BIG_AREA) {
        const recent = this.history.filter(r => r.t > now - 250 && r.area >= BIG_AREA);
        if (recent.length >= 2) {
          this.history = [];
          this.onGesture({ type: 'bigmove', cx: motion.cx, cy: motion.cy, timestamp: now });
          return;
        }
      }

      // Wave detection — horizontal back-and-forth
      const waveHistory = this.history.filter(r => r.t > now - WAVE_WINDOW_MS && r.area > 0.03);
      if (waveHistory.length >= 4) {
        const xs = waveHistory.map(r => r.cx);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const travel = maxX - minX;
        if (travel >= WAVE_MIN_TRAVEL) {
          const reversals = this.countReversals(xs);
          if (reversals >= 1) {
            this.history = [];
            this.onGesture({ type: 'wave', cx: motion.cx, cy: motion.cy, timestamp: now });
            return;
          }
        }
      }

      // Double burst detection
      if (motion.area >= 0.10) { // lower threshold (was 0.12)
        if (this.lastBurstTime > 0 && now - this.lastBurstTime < DOUBLE_BURST_GAP_MS) {
          this.lastBurstTime = 0;
          this.history = [];
          this.onGesture({ type: 'double_burst', cx: motion.cx, cy: motion.cy, timestamp: now });
          return;
        }
        this.lastBurstTime = now;
      }

      // Circle gesture — need enough points
      if (waveHistory.length >= 7) { // was 8
        if (this.detectCircle(waveHistory)) {
          this.history = [];
          this.onGesture({ type: 'circle', cx: motion.cx, cy: motion.cy, timestamp: now });
        }
      }

    } else {
      if (!this.wasStill && now - this.lastMotionTime > STILLNESS_MS) {
        this.wasStill = true;
        this.history = [];
        this.lastBurstTime = 0;
      }
      this.onMotion({ hasMotion: false, cx: 0.5, cy: 0.5, area: 0 });
    }
  }

  private computeMotion(prev: ImageData, curr: ImageData): MotionData {
    let motionPx = 0, sumX = 0, sumY = 0;
    const total = this.W * this.H;
    for (let i = 0; i < prev.data.length; i += 4) {
      const dr = Math.abs(curr.data[i]     - prev.data[i]);
      const dg = Math.abs(curr.data[i + 1] - prev.data[i + 1]);
      const db = Math.abs(curr.data[i + 2] - prev.data[i + 2]);
      if ((dr + dg + db) / 3 > MOTION_THRESHOLD) {
        const px = (i / 4) % this.W;
        const py = Math.floor((i / 4) / this.W);
        motionPx++; sumX += px; sumY += py;
      }
    }
    if (motionPx < 8) return { hasMotion: false, cx: 0.5, cy: 0.5, area: 0 }; // was 10
    return {
      hasMotion: true,
      cx: sumX / motionPx / this.W,
      cy: sumY / motionPx / this.H,
      area: motionPx / total,
    };
  }

  private countReversals(xs: number[]): number {
    let count = 0;
    for (let i = 1; i < xs.length - 1; i++) {
      const dx1 = xs[i] - xs[i - 1];
      const dx2 = xs[i + 1] - xs[i];
      if (Math.abs(dx1) > 0.015 && Math.abs(dx2) > 0.015 && dx1 * dx2 < 0) count++; // more sensitive (was 0.02)
    }
    return count;
  }

  private detectCircle(history: CentroidRecord[]): boolean {
    const xs = history.map(r => r.cx);
    const ys = history.map(r => r.cy);
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const radii = history.map(r => Math.hypot(r.cx - cx, r.cy - cy));
    const meanR = radii.reduce((a, b) => a + b, 0) / radii.length;
    if (meanR < 0.045) return false; // was 0.06 — more forgiving radius
    const angles = history.map(r => Math.atan2(r.cy - cy, r.cx - cx));
    let totalAngle = 0;
    for (let i = 1; i < angles.length; i++) {
      let da = angles[i] - angles[i - 1];
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      totalAngle += da;
    }
    return Math.abs(totalAngle) >= Math.PI * 1.0; // was 1.2 — less strict
  }
}

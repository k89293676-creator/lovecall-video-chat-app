import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useRoomStore } from '@/store/room-store';
import { getModeConfig } from '@/lib/modes';

interface TrailPoint { x: number; y: number; t: number; }

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string; emoji?: string; rotation?: number; rotV?: number;
}

interface CursorPos { x: number; y: number; visible: boolean; }

function mkParticles(count: number, init: (i: number) => Particle): Particle[] {
  return Array.from({ length: count }, (_, i) => init(i));
}

interface CanvasOverlayProps {
  sendMessage?: (data: unknown) => void;
}

export function CanvasOverlay({ sendMessage }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const partnerCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointsBufferRef = useRef<{ x: number; y: number }[]>([]);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const particlesRef = useRef<Record<string, Particle[]>>({});
  const trailRef = useRef<TrailPoint[]>([]);
  const [cursor, setCursor] = useState<CursorPos>({ x: 0, y: 0, visible: false });
  const calliAngleRef = useRef(0);

  const {
    activeEffects, isDrawingMode, drawColor, drawSize,
    drawTool, drawOpacity, stampEmoji, drawAction, clearDrawAction,
    motionData, mode, partnerCursor,
  } = useRoomStore();

  const modeConfig = getModeConfig(mode);

  const saveHistory = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(snap);
    if (trimmed.length > 30) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
  }, []);

  const rainbowHueRef = useRef(0);

  const renderStroke = useCallback((
    ctx: CanvasRenderingContext2D,
    pos: { x: number; y: number },
    last: { x: number; y: number } | null,
    prev: { x: number; y: number } | null,
    tool: string, color: string, size: number, opacity: number, emoji?: string,
  ) => {
    const alpha = opacity / 100;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.lineWidth = size * 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (last) {
        ctx.beginPath(); ctx.moveTo(last.x, last.y);
        ctx.quadraticCurveTo(last.x, last.y, (last.x + pos.x) / 2, (last.y + pos.y) / 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over'; return;
    }

    if (tool === 'spray') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = color;
      const spread = size * 4;
      for (let i = 0; i < size * 3; i++) {
        const angle = Math.random() * Math.PI * 2, radius = Math.random() * spread;
        ctx.beginPath(); ctx.arc(pos.x + Math.cos(angle) * radius, pos.y + Math.sin(angle) * radius, 0.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; return;
    }

    if (tool === 'neon') {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
      ctx.shadowColor = color; ctx.shadowBlur = size * 4; ctx.strokeStyle = color;
      ctx.lineWidth = size / 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (last) {
        const mx = (last.x + pos.x) / 2, my = (last.y + pos.y) / 2;
        ctx.beginPath(); ctx.moveTo(prev ? (prev.x + last.x) / 2 : last.x, prev ? (prev.y + last.y) / 2 : last.y);
        ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.stroke();
        ctx.shadowBlur = size * 8; ctx.lineWidth = size / 4; ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath(); ctx.moveTo(prev ? (prev.x + last.x) / 2 : last.x, prev ? (prev.y + last.y) / 2 : last.y);
        ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1; return;
    }

    if (tool === 'glow') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = size * 7;
      ctx.lineWidth = size * 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (last) {
        const mx = (last.x + pos.x) / 2, my = (last.y + pos.y) / 2;
        ctx.beginPath(); ctx.moveTo(prev ? (prev.x + last.x) / 2 : last.x, prev ? (prev.y + last.y) / 2 : last.y);
        ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.stroke();
      }
      ctx.globalAlpha = alpha * 0.15; ctx.shadowBlur = size * 14; ctx.lineWidth = size * 3;
      if (last) {
        const mx = (last.x + pos.x) / 2, my = (last.y + pos.y) / 2;
        ctx.beginPath(); ctx.moveTo(prev ? (prev.x + last.x) / 2 : last.x, prev ? (prev.y + last.y) / 2 : last.y);
        ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return;
    }

    if (tool === 'rainbow') {
      rainbowHueRef.current = (rainbowHueRef.current + 3) % 360;
      const rc = `hsl(${rainbowHueRef.current},100%,58%)`;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
      ctx.strokeStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = size * 2;
      ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (last) {
        const mx = (last.x + pos.x) / 2, my = (last.y + pos.y) / 2;
        ctx.beginPath(); ctx.moveTo(prev ? (prev.x + last.x) / 2 : last.x, prev ? (prev.y + last.y) / 2 : last.y);
        ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1; return;
    }

    if (tool === 'watercolor') {
      ctx.globalCompositeOperation = 'source-over';
      const spread = size * 2.2;
      for (let i = 0; i < 10; i++) {
        const rx = (Math.random() - 0.5) * spread, ry = (Math.random() - 0.5) * spread;
        const r = size * (0.7 + Math.random() * 0.9);
        ctx.globalAlpha = alpha * 0.10;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(pos.x + rx, pos.y + ry, r, 0, Math.PI * 2); ctx.fill();
      }
      if (last) {
        ctx.globalAlpha = alpha * 0.06;
        ctx.strokeStyle = color; ctx.lineWidth = size * 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
      }
      ctx.globalAlpha = 1; return;
    }

    if (tool === 'chalk') {
      ctx.globalCompositeOperation = 'source-over';
      if (last) {
        const dx = pos.x - last.x, dy = pos.y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.ceil(dist / 2));
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const cx2 = last.x + dx * t, cy2 = last.y + dy * t;
          for (let j = 0; j < size * 2; j++) {
            const ox = (Math.random() - 0.5) * size * 1.8;
            const oy = (Math.random() - 0.5) * size * 1.8;
            const a = (1 - Math.abs(ox) / (size * 1.8)) * alpha * 0.6;
            ctx.globalAlpha = a * Math.random();
            ctx.fillStyle = color;
            ctx.fillRect(cx2 + ox, cy2 + oy, Math.random() * 2, Math.random() * 2);
          }
        }
      }
      ctx.globalAlpha = 1; return;
    }

    if (tool === 'calligraphy') {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      if (last) {
        const dx = pos.x - last.x, dy = pos.y - last.y;
        const speed = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        calliAngleRef.current = calliAngleRef.current * 0.8 + angle * 0.2;
        const perpAngle = calliAngleRef.current + Math.PI / 4;
        const width = Math.max(1, size * 2 - speed * 0.08);
        const mx = (last.x + pos.x) / 2, my = (last.y + pos.y) / 2;
        ctx.beginPath();
        ctx.moveTo(last.x + Math.cos(perpAngle) * width, last.y + Math.sin(perpAngle) * width);
        ctx.quadraticCurveTo(mx + Math.cos(perpAngle) * width, my + Math.sin(perpAngle) * width, pos.x + Math.cos(perpAngle) * width, pos.y + Math.sin(perpAngle) * width);
        ctx.lineTo(pos.x - Math.cos(perpAngle) * width, pos.y - Math.sin(perpAngle) * width);
        ctx.quadraticCurveTo(mx - Math.cos(perpAngle) * width, my - Math.sin(perpAngle) * width, last.x - Math.cos(perpAngle) * width, last.y - Math.sin(perpAngle) * width);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1; return;
    }

    if (tool === 'marker') {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha * 0.72;
      ctx.strokeStyle = color; ctx.lineWidth = size * 3;
      ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
      if (last) {
        const mx = (last.x + pos.x) / 2, my = (last.y + pos.y) / 2;
        ctx.beginPath(); ctx.moveTo(prev ? (prev.x + last.x) / 2 : last.x, prev ? (prev.y + last.y) / 2 : last.y);
        ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.stroke();
      }
      ctx.globalAlpha = 1; return;
    }

    if (tool === 'stamp' && emoji) {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
      ctx.font = `${size * 6}px serif`;
      ctx.fillText(emoji, pos.x - size * 3, pos.y + size * 3);
      ctx.globalAlpha = 1; return;
    }

    // Default pen — Catmull-Rom spline via quadratic Bezier midpoints for maximum smoothness
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (last) {
      const dx = pos.x - last.x, dy = pos.y - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      const pressureWidth = Math.max(size * 0.4, size - speed * 0.03);
      ctx.lineWidth = pressureWidth;
      const mx = (last.x + pos.x) / 2, my = (last.y + pos.y) / 2;
      ctx.beginPath();
      ctx.moveTo(prev ? (prev.x + last.x) / 2 : last.x, prev ? (prev.y + last.y) / 2 : last.y);
      ctx.quadraticCurveTo(last.x, last.y, mx, my);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    if (!drawAction) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (drawAction === 'undo') {
      const idx = historyIndexRef.current - 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (idx >= 0) { ctx.putImageData(historyRef.current[idx], 0, 0); historyIndexRef.current = idx; }
      else historyIndexRef.current = -1;
    } else if (drawAction === 'redo') {
      const idx = historyIndexRef.current + 1;
      if (idx < historyRef.current.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(historyRef.current[idx], 0, 0);
        historyIndexRef.current = idx;
      }
    } else if (drawAction === 'clear') {
      saveHistory();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pc = partnerCanvasRef.current;
      if (pc) pc.getContext('2d')?.clearRect(0, 0, pc.width, pc.height);
      sendMessage?.({ type: 'draw_action', action: 'clear' });
    } else if (drawAction === 'save') {
      const merge = document.createElement('canvas');
      merge.width = canvas.width; merge.height = canvas.height;
      const mctx = merge.getContext('2d')!;
      const pc = partnerCanvasRef.current;
      if (pc) mctx.drawImage(pc, 0, 0);
      mctx.drawImage(canvas, 0, 0);
      const link = document.createElement('a');
      link.download = 'moonlight-drawing.png';
      link.href = merge.toDataURL('image/png');
      link.click();
    }
    clearDrawAction();
  }, [drawAction, clearDrawAction, saveHistory, sendMessage]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isDrawingMode) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); useRoomStore.getState().triggerDrawAction('undo');
      } else if ((e.ctrlKey || e.metaKey) && (e.shiftKey ? e.key === 'z' : e.key === 'y')) {
        e.preventDefault(); useRoomStore.getState().triggerDrawAction('redo');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDrawingMode]);

  useEffect(() => {
    if (motionData && motionData.area > 0.02) {
      const W = window.innerWidth, H = window.innerHeight;
      trailRef.current.push({ x: motionData.cx * W, y: motionData.cy * H, t: Date.now() });
      if (trailRef.current.length > 20) trailRef.current.shift();
    }
  }, [motionData]);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail as Record<string, unknown>;
      const pc = partnerCanvasRef.current;
      if (!pc) return;
      const ctx = pc.getContext('2d');
      if (!ctx) return;

      if (data.type === 'draw_stroke') {
        const pos = { x: Number(data.x2), y: Number(data.y2) };
        const last = (data.x1 != null && data.y1 != null) ? { x: Number(data.x1), y: Number(data.y1) } : null;
        const prev = (data.px != null && data.py != null) ? { x: Number(data.px), y: Number(data.py) } : null;
        renderStroke(ctx, pos, last, prev,
          String(data.tool ?? 'pen'),
          String(data.color ?? '#e11d48'),
          Number(data.size ?? 4),
          Number(data.opacity ?? 90),
          data.emoji ? String(data.emoji) : undefined,
        );
      } else if (data.type === 'draw_action' && data.action === 'clear') {
        ctx.clearRect(0, 0, pc.width, pc.height);
      }
    };
    window.addEventListener('peer-draw', handler);
    return () => window.removeEventListener('peer-draw', handler);
  }, [renderStroke]);

  // Ambient effects canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = {};
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let animId: number;
    let time = 0;

    const ensureParticles = (key: string, count: number, factory: (i: number) => Particle) => {
      if (!particlesRef.current[key]) particlesRef.current[key] = mkParticles(count, factory);
      return particlesRef.current[key];
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width, H = canvas.height;
      const state = useRoomStore.getState();
      const effects = state.activeEffects;
      const motion = state.motionData;
      const mc = getModeConfig(state.mode);

      // Mode border glow
      {
        const borderW = 12 + Math.sin(time * 0.03) * 3;
        ctx.save();
        ctx.shadowColor = mc.primaryColor; ctx.shadowBlur = borderW * 1.5;
        ctx.strokeStyle = mc.primaryColor + '40'; ctx.lineWidth = borderW;
        ctx.strokeRect(borderW / 2, borderW / 2, W - borderW, H - borderW);
        ctx.restore();
      }

      if (effects.includes('filter_motion_bloom') && motion) {
        const mx = motion.cx * W, my = motion.cy * H;
        const intensity = Math.min(motion.area * 8, 1);
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + time * 0.05;
          const r = 20 + Math.sin(time * 0.1 + i) * 15;
          ctx.globalAlpha = intensity * (0.5 + Math.sin(time * 0.12 + i) * 0.4);
          ctx.font = `${10 + Math.sin(time * 0.08 + i) * 4}px serif`;
          ctx.fillText(['✦', '✧', '⋆', '★'][i % 4], mx + Math.cos(angle) * r - 6, my + Math.sin(angle) * r + 6);
        }
        const rg = ctx.createRadialGradient(mx, my, 0, mx, my, 60 * intensity);
        rg.addColorStop(0, mc.primaryColor + '40'); rg.addColorStop(1, 'transparent');
        ctx.globalAlpha = intensity; ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(mx, my, 60 * intensity, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (effects.includes('filter_light_trails') && trailRef.current.length > 1) {
        const now = Date.now();
        const trail = trailRef.current.filter(p => now - p.t < 800);
        if (trail.length > 1) {
          ctx.save(); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (let i = 1; i < trail.length; i++) {
            const age = (now - trail[i].t) / 800;
            ctx.globalAlpha = (1 - age) * 0.7;
            ctx.shadowColor = mc.primaryColor; ctx.shadowBlur = 12; ctx.strokeStyle = mc.primaryColor;
            ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
          }
          ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
        }
      }

      if (effects.includes('filter_film_grain')) {
        ctx.save();
        for (let i = 0; i < 800; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
          ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
        }
        const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,5,0.45)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); ctx.restore();
      }

      if (effects.includes('filter_kaleidoscope')) {
        ctx.save();
        for (let s = 0; s < 8; s++) {
          const angle = (s / 8) * Math.PI * 2 + time * 0.005;
          const r2 = Math.min(W, H) * 0.44 + 18 + Math.sin(time * 0.04 + s) * 8;
          const hue = (s * 45 + time * 0.5) % 360;
          ctx.strokeStyle = `hsla(${hue},70%,65%,0.35)`; ctx.lineWidth = 2 + Math.sin(time * 0.06 + s) * 1;
          ctx.shadowColor = `hsl(${hue},80%,60%)`; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(W / 2, H / 2, r2, angle, angle + Math.PI * 2 / 8); ctx.stroke();
        }
        ctx.restore();
      }

      if (effects.includes('filter_wax')) {
        for (let i = 0; i < 6; i++) {
          const x = (Math.sin(time * 0.01 + i * 1.2) * 0.5 + 0.5) * W;
          const y = (time * 1.5 + i * 140) % H;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
          g.addColorStop(0, 'rgba(220,40,40,0.7)'); g.addColorStop(1, 'rgba(180,20,20,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,80,80,0.4)';
          ctx.beginPath(); ctx.ellipse(x, y + 6, 3, 10, 0, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (effects.includes('filter_ice')) {
        ctx.fillStyle = 'rgba(100,180,255,0.08)'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(160,220,255,0.12)'; ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const x = (Math.sin(i * 2.3) * 0.5 + 0.5) * W;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.sin(time * 0.005) * 50, H); ctx.stroke();
        }
      }

      if (effects.includes('filter_blindfold')) {
        const gradient = ctx.createRadialGradient(W / 2, H * 0.4, 80, W / 2, H / 2, W / 1.3);
        gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
        const bandH = H * 0.12, bandY = H * 0.3;
        const sg = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
        sg.addColorStop(0, 'rgba(20,10,30,0.85)'); sg.addColorStop(0.5, 'rgba(40,20,60,0.9)'); sg.addColorStop(1, 'rgba(20,10,30,0.85)');
        ctx.fillStyle = sg; ctx.fillRect(0, bandY, W, bandH);
      }

      if (effects.includes('filter_vignette')) {
        const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }

      if (effects.includes('filter_hearts')) {
        for (let i = 0; i < 5; i++) {
          const phase = (time * 0.008 + i * 0.7) % 1;
          const x = (Math.sin(i * 2.4 + time * 0.004) * 0.4 + 0.5) * W;
          const y = H - phase * H * 1.2;
          const opacity = phase < 0.1 ? phase * 10 : phase > 0.8 ? (1 - phase) * 5 : 0.7;
          ctx.font = `${20 + Math.sin(time * 0.05 + i) * 4}px serif`;
          ctx.globalAlpha = opacity;
          ctx.fillText(['❤️', '💕', '💗', '💖', '💝'][i % 5], x, y);
          ctx.globalAlpha = 1;
        }
      }

      if (effects.includes('filter_starfall')) {
        const stars = ensureParticles('starfall', 40, () => ({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5, vy: 0.4 + Math.random() * 0.8,
          life: Math.random(), maxLife: 1, size: 1 + Math.random() * 2.5, color: '#fff',
        }));
        stars.forEach(s => {
          s.x += s.vx; s.y += s.vy;
          if (s.y > H) { s.y = -5; s.x = Math.random() * W; }
          const tw = 0.4 + Math.abs(Math.sin(time * 0.05 + s.x)) * 0.6;
          ctx.globalAlpha = tw; ctx.fillStyle = '#fff'; ctx.shadowColor = '#adf'; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = tw * 0.3; ctx.strokeStyle = '#adf'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(s.x, s.y - s.size * 3); ctx.lineTo(s.x, s.y + s.size * 3);
          ctx.moveTo(s.x - s.size * 3, s.y); ctx.lineTo(s.x + s.size * 3, s.y); ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }

      if (effects.includes('filter_aurora')) {
        const bands = [
          { c1: 'rgba(0,255,180,0)', c2: 'rgba(0,255,180,0.12)', o: 0 },
          { c1: 'rgba(100,80,255,0)', c2: 'rgba(100,80,255,0.10)', o: 0.3 },
          { c1: 'rgba(255,80,180,0)', c2: 'rgba(255,80,180,0.08)', o: 0.6 },
        ];
        bands.forEach(({ c1, c2, o }) => {
          const wave = Math.sin(time * 0.005 + o * 10) * H * 0.08;
          const yTop = H * 0.1 + wave + o * H * 0.12;
          const g = ctx.createLinearGradient(0, yTop, 0, yTop + H * 0.35);
          g.addColorStop(0, c1); g.addColorStop(0.4, c2); g.addColorStop(1, c1);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(0, yTop);
          for (let x = 0; x <= W; x += 20) {
            const y = yTop + Math.sin(x * 0.008 + time * 0.008 + o * 5) * H * 0.06; ctx.lineTo(x, y);
          }
          ctx.lineTo(W, yTop + H * 0.35); ctx.lineTo(0, yTop + H * 0.35);
          ctx.closePath(); ctx.fill();
        });
      }

      if (effects.includes('filter_butterflies')) {
        const BUTTERS = ['🦋', '🌸', '🦋', '🌺', '🦋'];
        for (let i = 0; i < 5; i++) {
          const t2 = time * 0.006 + i * 1.3;
          const x = (Math.sin(t2 * 0.7 + i) * 0.4 + 0.5) * W;
          const y = (Math.cos(t2 * 0.5 + i * 0.8) * 0.35 + 0.5) * H;
          const wf = Math.abs(Math.sin(time * 0.15 + i));
          ctx.save(); ctx.translate(x, y); ctx.scale(wf * 0.5 + 0.7, 1);
          ctx.font = `${22 + Math.sin(time * 0.04 + i) * 3}px serif`; ctx.globalAlpha = 0.75;
          ctx.fillText(BUTTERS[i % BUTTERS.length], -12, 8);
          ctx.restore(); ctx.globalAlpha = 1;
        }
      }

      if (effects.includes('filter_confetti')) {
        const CONFETTI_COLORS = ['#e11d48', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#fff'];
        const confetti = ensureParticles('confetti', 50, (i) => ({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2,
          life: 1, maxLife: 1, size: 4 + Math.random() * 5, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          rotation: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.15,
        }));
        confetti.forEach(c => {
          c.x += c.vx + Math.sin(time * 0.03 + c.y * 0.01) * 0.5; c.y += c.vy;
          c.rotation! += c.rotV!;
          if (c.y > H + 10) { c.y = -10; c.x = Math.random() * W; }
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rotation!);
          ctx.fillStyle = c.color; ctx.globalAlpha = 0.85;
          ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
          ctx.restore(); ctx.globalAlpha = 1;
        });
      }

      if (effects.includes('filter_petals')) {
        const PETALS = ['🌸', '🌺', '🌷', '🌹'];
        const petals = ensureParticles('petals', 18, (i) => ({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.7, vy: 0.5 + Math.random() * 1,
          life: 1, maxLife: 1, size: 14 + Math.random() * 8, color: '#e11d48',
          rotation: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.05,
          emoji: PETALS[i % PETALS.length],
        }));
        petals.forEach(p => {
          p.x += p.vx + Math.sin(time * 0.02 + p.y * 0.01) * 0.6; p.y += p.vy;
          p.rotation! += p.rotV!;
          if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation!);
          ctx.font = `${p.size}px serif`; ctx.globalAlpha = 0.8;
          ctx.fillText(p.emoji!, -p.size / 2, p.size / 2);
          ctx.restore(); ctx.globalAlpha = 1;
        });
      }

      if (effects.includes('filter_sparkle')) {
        const PTS = [0.25, 0.75, 0.5, 0.15, 0.85, 0.5, 0.35, 0.65];
        for (let i = 0; i < 4; i++) {
          const px = PTS[i * 2] * W, py = PTS[i * 2 + 1] * H;
          for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2 + time * 0.02 * (i % 2 === 0 ? 1 : -1);
            const r = 20 + Math.sin(time * 0.05 + j + i) * 10;
            ctx.globalAlpha = 0.5 + Math.sin(time * 0.07 + j + i) * 0.4;
            ctx.fillStyle = ['#fff', '#fda4af', '#fbbf24', '#c4b5fd'][i % 4];
            ctx.font = `${8 + Math.sin(time * 0.05 + j) * 3}px serif`;
            ctx.fillText('✦', px + Math.cos(angle) * r - 6, py + Math.sin(angle) * r + 6);
          }
          ctx.globalAlpha = 1;
        }
      }

      // Partner cursor indicator
      const pc = state.partnerCursor;
      if (pc && state.isDrawingMode) {
        const mc2 = getModeConfig(state.mode);
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = mc2.primaryColor;
        ctx.fillStyle = mc2.primaryColor + '30';
        ctx.lineWidth = 2;
        ctx.shadowColor = mc2.primaryColor;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(pc.x * W, pc.y * H, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 0;
        ctx.fillText('partner', pc.x * W + 14, pc.y * H + 4);
        ctx.restore();
      }

      time++;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animId); };
  }, []);

  useEffect(() => {
    const resize = () => {
      [drawCanvasRef.current, partnerCanvasRef.current].forEach(canvas => {
        if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
      });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const applyStroke = useCallback((ctx: CanvasRenderingContext2D, pos: { x: number; y: number }, last: { x: number; y: number } | null) => {
    renderStroke(ctx, pos, last, prevPosRef.current, drawTool, drawColor, drawSize, drawOpacity, stampEmoji);
  }, [renderStroke, drawTool, drawColor, drawSize, drawOpacity, stampEmoji]);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return; e.preventDefault();
    const pos = getPos(e);
    if (drawTool === 'stamp') {
      const canvas = drawCanvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      saveHistory();
      ctx.font = `${drawSize * 6}px serif`; ctx.globalAlpha = drawOpacity / 100;
      ctx.fillText(stampEmoji, pos.x - drawSize * 3, pos.y + drawSize * 3);
      ctx.globalAlpha = 1;
      sendMessage?.({ type: 'draw_stroke', tool: 'stamp', x2: pos.x, y2: pos.y, emoji: stampEmoji, size: drawSize, opacity: drawOpacity });
      return;
    }
    saveHistory();
    isDrawingRef.current = true;
    lastPosRef.current = pos;
    prevPosRef.current = null;
    pointsBufferRef.current = [pos];
    calliAngleRef.current = 0;
  }, [isDrawingMode, drawTool, drawSize, stampEmoji, drawOpacity, saveHistory, sendMessage]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode || !isDrawingRef.current) return; e.preventDefault();
    const canvas = drawCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e);
    applyStroke(ctx, pos, lastPosRef.current);

    // Normalize cursor to 0-1 range for cross-device sync
    sendMessage?.({
      type: 'draw_stroke',
      x1: lastPosRef.current?.x ?? pos.x,
      y1: lastPosRef.current?.y ?? pos.y,
      px: prevPosRef.current?.x,
      py: prevPosRef.current?.y,
      x2: pos.x, y2: pos.y,
      tool: drawTool, color: drawColor, size: drawSize, opacity: drawOpacity,
    });

    prevPosRef.current = lastPosRef.current;
    lastPosRef.current = pos;
  }, [isDrawingMode, applyStroke, sendMessage, drawTool, drawColor, drawSize, drawOpacity]);

  // Send cursor position to partner when drawing
  const sendCursorUpdate = useCallback((e: React.MouseEvent) => {
    if (!isDrawingMode) return;
    const W = window.innerWidth, H = window.innerHeight;
    sendMessage?.({
      type: 'partner_cursor',
      x: e.clientX / W,
      y: e.clientY / H,
    });
  }, [isDrawingMode, sendMessage]);

  const stopDraw = useCallback(() => { isDrawingRef.current = false; lastPosRef.current = null; prevPosRef.current = null; }, []);

  const getCursorStyle = () => { if (!isDrawingMode) return 'default'; return 'none'; };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursor({ x: e.clientX, y: e.clientY, visible: true });
    draw(e);
    sendCursorUpdate(e);
  }, [draw, sendCursorUpdate]);

  const handleMouseLeave = useCallback(() => {
    setCursor(c => ({ ...c, visible: false }));
    stopDraw();
  }, [stopDraw]);

  const getCursorSize = () => {
    if (drawTool === 'eraser') return drawSize * 4;
    if (drawTool === 'spray') return drawSize * 4;
    if (drawTool === 'calligraphy') return drawSize * 2;
    return drawSize;
  };

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" style={{ width: '100%', height: '100%' }} />

      <canvas
        ref={partnerCanvasRef}
        className="absolute inset-0 z-18 pointer-events-none"
        style={{ width: '100%', height: '100%', opacity: 0.75 }}
      />

      <canvas
        ref={drawCanvasRef}
        className={`absolute inset-0 z-20 ${isDrawingMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ width: '100%', height: '100%', cursor: getCursorStyle() }}
        onMouseDown={startDraw}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDraw}
        onMouseLeave={handleMouseLeave}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchCancel={stopDraw}
        onTouchEnd={stopDraw}
      />

      {/* Custom cursor preview */}
      {isDrawingMode && cursor.visible && drawTool !== 'stamp' && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%,-50%)',
            width: getCursorSize() * 2 + (drawTool === 'neon' ? 8 : 0),
            height: getCursorSize() * 2 + (drawTool === 'neon' ? 8 : 0),
            borderRadius: drawTool === 'calligraphy' ? '2px' : '50%',
            border: drawTool === 'eraser'
              ? '2px dashed rgba(255,255,255,0.7)'
              : `2px solid ${drawColor}`,
            backgroundColor: drawTool === 'eraser'
              ? 'rgba(255,255,255,0.05)'
              : `${drawColor}${Math.round(drawOpacity * 0.4).toString(16).padStart(2, '0')}`,
            boxShadow: drawTool === 'neon' || drawTool === 'glow'
              ? `0 0 ${drawSize * 3}px ${drawColor}, 0 0 ${drawSize * 6}px ${drawColor}80`
              : 'none',
            transform: drawTool === 'calligraphy'
              ? 'translate(-50%,-50%) rotate(45deg)'
              : 'translate(-50%,-50%)',
          }}
        />
      )}
      {isDrawingMode && cursor.visible && drawTool === 'stamp' && (
        <div
          className="fixed pointer-events-none z-50 select-none"
          style={{ left: cursor.x, top: cursor.y, transform: 'translate(-50%,-50%)', fontSize: drawSize * 6, lineHeight: 1, opacity: drawOpacity / 100 }}>
          {stampEmoji}
        </div>
      )}
    </>
  );
}
